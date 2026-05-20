import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type {
  WorkspaceMemberWithEmail,
  WorkspaceRole,
  MemberActionResult,
} from '../types/database'

interface MembersContextValue {
  members: WorkspaceMemberWithEmail[]
  loading: boolean
  error: string | null
  currentUserRole: WorkspaceRole | null
  // workspaceId activo (último que se consultó)
  activeWorkspaceId: string | null
  setActiveWorkspaceId: (id: string | null) => void
  fetchMembers: (workspaceId: string) => Promise<void>
  addMember: (workspaceId: string, email: string, role: 'admin' | 'member') => Promise<MemberActionResult>
  removeMember: (workspaceId: string, userId: string) => Promise<MemberActionResult>
}

const MembersContext = createContext<MembersContextValue | undefined>(undefined)

interface MembersProviderProps {
  children: ReactNode
}

export function MembersProvider({ children }: MembersProviderProps) {
  const { user } = useAuth()
  const [members, setMembers] = useState<WorkspaceMemberWithEmail[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)

  // Rol del usuario actual en el workspace activo
  const currentUserRole: WorkspaceRole | null = user
    ? (members.find((m) => m.user_id === user.id)?.role ?? null)
    : null

  const fetchMembers = useCallback(async (workspaceId: string) => {
    if (!workspaceId) return

    setLoading(true)
    setError(null)
    setActiveWorkspaceId(workspaceId)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_workspace_members', {
        target_workspace_id: workspaceId,
      })

      if (rpcError) throw rpcError

      setMembers((data ?? []) as WorkspaceMemberWithEmail[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar miembros'
      console.error('fetchMembers error:', err)
      setError(message)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  const addMember = useCallback(
    async (
      workspaceId: string,
      email: string,
      role: 'admin' | 'member'
    ): Promise<MemberActionResult> => {
      try {
        const { data, error: rpcError } = await supabase.rpc('add_workspace_member', {
          target_workspace_id: workspaceId,
          invitee_email: email,
          invitee_role: role,
        })

        if (rpcError) throw rpcError

        const result = data as MemberActionResult

        if (result.success) {
          await fetchMembers(workspaceId)
        }

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al agregar miembro'
        console.error('addMember error:', err)
        return { success: false, message }
      }
    },
    [fetchMembers]
  )

  const removeMember = useCallback(
    async (workspaceId: string, userId: string): Promise<MemberActionResult> => {
      try {
        const { data, error: rpcError } = await supabase.rpc('remove_workspace_member', {
          target_workspace_id: workspaceId,
          target_user_id: userId,
        })

        if (rpcError) throw rpcError

        const result = data as MemberActionResult

        if (result.success && userId !== user?.id) {
          await fetchMembers(workspaceId)
        }

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar miembro'
        console.error('removeMember error:', err)
        return { success: false, message }
      }
    },
    [fetchMembers, user?.id]
  )

  // Limpiar miembros cuando el usuario hace logout
  useEffect(() => {
    if (!user) {
      setMembers([])
      setError(null)
      setActiveWorkspaceId(null)
    }
  }, [user])

  return (
    <MembersContext.Provider
      value={{
        members,
        loading,
        error,
        currentUserRole,
        activeWorkspaceId,
        setActiveWorkspaceId,
        fetchMembers,
        addMember,
        removeMember,
      }}
    >
      {children}
    </MembersContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMembers() {
  const context = useContext(MembersContext)
  if (context === undefined) {
    throw new Error('useMembers debe usarse dentro de un MembersProvider')
  }
  return context
}