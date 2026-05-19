import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Workspace } from '../types/database'

interface WorkspacesContextType {
  workspaces: Workspace[]
  loading: boolean
  error: string | null
  createWorkspace: (
    name: string,
    description?: string
  ) => Promise<{ data?: Workspace; error: Error | null }>
  deleteWorkspace: (workspaceId: string) => Promise<{ error: Error | null }>
  refetch: () => Promise<void>
}

const WorkspacesContext = createContext<WorkspacesContextType | undefined>(undefined)

export function WorkspacesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar workspaces del usuario actual
  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([])
      setLoading(false)
      return
    }

    setError(null)

    const { data, error: fetchError } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setWorkspaces([])
    } else {
      setWorkspaces(data ?? [])
    }

    setLoading(false)
  }, [user])

  // Cargar inicialmente cuando cambia el usuario
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (cancelled) return
      await fetchWorkspaces()
    }

    load()

    return () => {
      cancelled = true
    }
  }, [fetchWorkspaces])

  // Crear un workspace nuevo
  const createWorkspace = async (name: string, description?: string) => {
    if (!user) {
      return { error: new Error('Usuario no autenticado') }
    }

    const { data, error: insertError } = await supabase
      .from('workspaces')
      .insert({
        name,
        description: description ?? null,
        owner_id: user.id,
      })
      .select()
      .single()

    if (insertError) {
      return { error: new Error(insertError.message) }
    }

    // Actualizar el estado local inmediatamente (sin esperar al fetch)
    if (data) {
      setWorkspaces((prev) => [data, ...prev])
    }

    return { data, error: null }
  }

  // Borrar un workspace
  const deleteWorkspace = async (workspaceId: string) => {
    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)

    if (deleteError) {
      return { error: new Error(deleteError.message) }
    }

    // Actualizar el estado local inmediatamente
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId))

    return { error: null }
  }

  return (
    <WorkspacesContext.Provider
      value={{
        workspaces,
        loading,
        error,
        createWorkspace,
        deleteWorkspace,
        refetch: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspacesContext.Provider>
  )
}

export function useWorkspaces() {
  const context = useContext(WorkspacesContext)
  if (context === undefined) {
    throw new Error('useWorkspaces debe usarse dentro de WorkspacesProvider')
  }
  return context
}
