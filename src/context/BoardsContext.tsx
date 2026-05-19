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
import type { Board } from '../types/database'

interface BoardsContextType {
  boards: Board[]
  loading: boolean
  error: string | null
  createBoard: (
    name: string,
    backgroundColor: string,
    description?: string
  ) => Promise<{ data?: Board; error: Error | null }>
  deleteBoard: (boardId: string) => Promise<{ error: Error | null }>
  refetch: () => Promise<void>
}

const BoardsContext = createContext<BoardsContextType | undefined>(undefined)

interface BoardsProviderProps {
  children: ReactNode
  workspaceId: string
}

export function BoardsProvider({ children, workspaceId }: BoardsProviderProps) {
  const { user } = useAuth()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar boards del workspace actual
  const fetchBoards = useCallback(async () => {
    if (!user || !workspaceId) {
      setBoards([])
      setLoading(false)
      return
    }

    setError(null)
    setLoading(true)

    const { data, error: fetchError } = await supabase
      .from('boards')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setBoards([])
    } else {
      setBoards(data ?? [])
    }

    setLoading(false)
  }, [user, workspaceId])

  // Cargar cada vez que cambia el workspace o el usuario
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (cancelled) return
      await fetchBoards()
    }

    load()

    return () => {
      cancelled = true
    }
  }, [fetchBoards])

  // Crear un board nuevo
  const createBoard = async (
    name: string,
    backgroundColor: string,
    description?: string
  ) => {
    if (!user) {
      return { error: new Error('Usuario no autenticado') }
    }

    const { data, error: insertError } = await supabase
      .from('boards')
      .insert({
        workspace_id: workspaceId,
        name,
        description: description ?? null,
        background_color: backgroundColor,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      return { error: new Error(insertError.message) }
    }

    if (data) {
      setBoards((prev) => [data, ...prev])
    }

    return { data, error: null }
  }

  // Borrar un board
  const deleteBoard = async (boardId: string) => {
    const { error: deleteError } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId)

    if (deleteError) {
      return { error: new Error(deleteError.message) }
    }

    setBoards((prev) => prev.filter((b) => b.id !== boardId))

    return { error: null }
  }

  return (
    <BoardsContext.Provider
      value={{
        boards,
        loading,
        error,
        createBoard,
        deleteBoard,
        refetch: fetchBoards,
      }}
    >
      {children}
    </BoardsContext.Provider>
  )
}

export function useBoards() {
  const context = useContext(BoardsContext)
  if (context === undefined) {
    throw new Error('useBoards debe usarse dentro de BoardsProvider')
  }
  return context
}