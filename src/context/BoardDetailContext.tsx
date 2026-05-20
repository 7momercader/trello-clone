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
import type {
  List,
  Card,
  ListWithCards,
  CardAssignmentWithEmail,
  AssignmentActionResult,
  CommentWithAuthor,
  CommentActionResult,
} from '../types/database'

interface BoardDetailContextType {
  lists: ListWithCards[]
  loading: boolean
  error: string | null
  boardWorkspaceId: string | null
  assignmentsByCardId: Record<string, CardAssignmentWithEmail[]>
  commentsByCardId: Record<string, CommentWithAuthor[]>
  createList: (name: string) => Promise<{ data?: List; error: Error | null }>
  deleteList: (listId: string) => Promise<{ error: Error | null }>
  createCard: (
    listId: string,
    title: string
  ) => Promise<{ data?: Card; error: Error | null }>
  updateCard: (
    cardId: string,
    updates: { title?: string; description?: string | null; due_date?: string | null }
  ) => Promise<{ data?: Card; error: Error | null }>
  deleteCard: (cardId: string) => Promise<{ error: Error | null }>
  moveCard: (
    cardId: string,
    newListId: string,
    newPosition: number
  ) => Promise<{ error: Error | null }>
  fetchCardAssignments: (cardId: string) => Promise<void>
  assignMemberToCard: (cardId: string, userId: string) => Promise<AssignmentActionResult>
  unassignMemberFromCard: (cardId: string, userId: string) => Promise<AssignmentActionResult>
  fetchCardComments: (cardId: string) => Promise<void>
  addCardComment: (cardId: string, content: string) => Promise<CommentActionResult>
  deleteCardComment: (cardId: string, commentId: string) => Promise<CommentActionResult>
  refetch: () => Promise<void>
}

const BoardDetailContext = createContext<BoardDetailContextType | undefined>(undefined)

interface BoardDetailProviderProps {
  children: ReactNode
  boardId: string
}

export function BoardDetailProvider({ children, boardId }: BoardDetailProviderProps) {
  const { user } = useAuth()
  const [lists, setLists] = useState<ListWithCards[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [boardWorkspaceId, setBoardWorkspaceId] = useState<string | null>(null)
  const [assignmentsByCardId, setAssignmentsByCardId] = useState<Record<string, CardAssignmentWithEmail[]>>({})
  const [commentsByCardId, setCommentsByCardId] = useState<Record<string, CommentWithAuthor[]>>({})

  const fetchLists = useCallback(async () => {
    if (!user || !boardId) {
      setLists([])
      setAssignmentsByCardId({})
      setCommentsByCardId({})
      setBoardWorkspaceId(null)
      setLoading(false)
      return
    }

    setError(null)

    const { data: boardData, error: boardError } = await supabase
      .from('boards')
      .select('workspace_id')
      .eq('id', boardId)
      .single()

    if (boardError) {
      console.error('Error al traer board:', boardError.message)
    } else if (boardData) {
      setBoardWorkspaceId(boardData.workspace_id)
    }

    const { data: listsData, error: listsError } = await supabase
      .from('lists')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true })

    if (listsError) {
      setError(listsError.message)
      setLists([])
      setLoading(false)
      return
    }

    const listIds = (listsData ?? []).map((l) => l.id)
    let cardsData: Card[] = []

    if (listIds.length > 0) {
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .in('list_id', listIds)
        .order('position', { ascending: true })

      if (cardsError) {
        setError(cardsError.message)
        setLists([])
        setLoading(false)
        return
      }

      cardsData = cards ?? []
    }

    const listsWithCards: ListWithCards[] = (listsData ?? []).map((list) => ({
      ...list,
      cards: cardsData.filter((c) => c.list_id === list.id),
    }))

    setLists(listsWithCards)

    if (cardsData.length > 0) {
      const cardIds = cardsData.map((c) => c.id)
      const { data: rawAssignments, error: assignErr } = await supabase
        .from('card_assignments')
        .select('id, card_id, user_id, assigned_at')
        .in('card_id', cardIds)

      if (assignErr) {
        console.error('Error cargando asignaciones:', assignErr.message)
        setAssignmentsByCardId({})
      } else if (rawAssignments && rawAssignments.length > 0) {
        const cardsWithAssignments = Array.from(new Set(rawAssignments.map((a) => a.card_id)))
        const newMap: Record<string, CardAssignmentWithEmail[]> = {}

        await Promise.all(
          cardsWithAssignments.map(async (cid) => {
            const { data, error: rpcErr } = await supabase.rpc('get_card_assignments', {
              target_card_id: cid,
            })
            if (!rpcErr && data) {
              newMap[cid] = data as CardAssignmentWithEmail[]
            }
          })
        )

        setAssignmentsByCardId(newMap)
      } else {
        setAssignmentsByCardId({})
      }
    } else {
      setAssignmentsByCardId({})
    }

    setLoading(false)
  }, [user, boardId])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (cancelled) return
      setLoading(true)
      await fetchLists()
    }

    load()

    return () => {
      cancelled = true
    }
  }, [fetchLists])

  // Realtime: lists, cards, card_assignments, comments
  useEffect(() => {
    if (!boardId || !user) return

    const channel = supabase
      .channel(`board:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          fetchLists()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
        },
        () => {
          fetchLists()
        }
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'card_assignments',
        },
        () => {
          fetchLists()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        () => {
          // Realtime: detectamos cambios pero no hacemos nada acá.
          // El EditCardModal vuelve a fetchear sus propios comments al abrirse.
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId, user, fetchLists])

  const createList = async (name: string) => {
    if (!user) {
      return { error: new Error('Usuario no autenticado') }
    }

    const nextPosition = lists.length

    const { data, error: insertError } = await supabase
      .from('lists')
      .insert({
        board_id: boardId,
        name,
        position: nextPosition,
      })
      .select()
      .single()

    if (insertError) {
      return { error: new Error(insertError.message) }
    }

    if (data) {
      setLists((prev) => [...prev, { ...data, cards: [] }])
    }

    return { data, error: null }
  }

  const deleteList = async (listId: string) => {
    const { error: deleteError } = await supabase
      .from('lists')
      .delete()
      .eq('id', listId)

    if (deleteError) {
      return { error: new Error(deleteError.message) }
    }

    setLists((prev) => prev.filter((l) => l.id !== listId))
    return { error: null }
  }

  const createCard = async (listId: string, title: string) => {
    if (!user) {
      return { error: new Error('Usuario no autenticado') }
    }

    const targetList = lists.find((l) => l.id === listId)
    const nextPosition = targetList ? targetList.cards.length : 0

    const { data, error: insertError } = await supabase
      .from('cards')
      .insert({
        list_id: listId,
        title,
        position: nextPosition,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      return { error: new Error(insertError.message) }
    }

    if (data) {
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId ? { ...l, cards: [...l.cards, data] } : l
        )
      )
    }

    return { data, error: null }
  }

  const updateCard = async (
    cardId: string,
    updates: { title?: string; description?: string | null; due_date?: string | null }
  ) => {
    const { data, error: updateError } = await supabase
      .from('cards')
      .update(updates)
      .eq('id', cardId)
      .select()
      .single()

    if (updateError) {
      return { error: new Error(updateError.message) }
    }

    if (data) {
      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => (c.id === cardId ? data : c)),
        }))
      )
    }

    return { data, error: null }
  }

  const deleteCard = async (cardId: string) => {
    const { error: deleteError } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId)

    if (deleteError) {
      return { error: new Error(deleteError.message) }
    }

    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        cards: l.cards.filter((c) => c.id !== cardId),
      }))
    )

    setAssignmentsByCardId((prev) => {
      const copy = { ...prev }
      delete copy[cardId]
      return copy
    })

    setCommentsByCardId((prev) => {
      const copy = { ...prev }
      delete copy[cardId]
      return copy
    })

    return { error: null }
  }

  const moveCard = async (
    cardId: string,
    newListId: string,
    newPosition: number
  ) => {
    let sourceCard: Card | undefined
    let sourceListId: string | undefined

    for (const list of lists) {
      const found = list.cards.find((c) => c.id === cardId)
      if (found) {
        sourceCard = found
        sourceListId = list.id
        break
      }
    }

    if (!sourceCard || !sourceListId) {
      return { error: new Error('Tarjeta no encontrada') }
    }

    setLists((prev) => {
      const withoutCard = prev.map((l) =>
        l.id === sourceListId
          ? { ...l, cards: l.cards.filter((c) => c.id !== cardId) }
          : l
      )

      return withoutCard.map((l) => {
        if (l.id !== newListId) return l

        const updatedCard = { ...sourceCard!, list_id: newListId, position: newPosition }
        const newCards = [...l.cards]
        newCards.splice(newPosition, 0, updatedCard)

        const reorderedCards = newCards.map((c, idx) => ({ ...c, position: idx }))

        return { ...l, cards: reorderedCards }
      })
    })

    const { error: updateError } = await supabase
      .from('cards')
      .update({ list_id: newListId, position: newPosition })
      .eq('id', cardId)

    if (updateError) {
      await fetchLists()
      return { error: new Error(updateError.message) }
    }

    return { error: null }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Asignaciones de miembros a cards
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const fetchCardAssignments = useCallback(async (cardId: string) => {
    if (!cardId) return

    try {
      const { data, error: rpcError } = await supabase.rpc('get_card_assignments', {
        target_card_id: cardId,
      })

      if (rpcError) throw rpcError

      setAssignmentsByCardId((prev) => ({
        ...prev,
        [cardId]: (data ?? []) as CardAssignmentWithEmail[],
      }))
    } catch (err) {
      console.error('fetchCardAssignments error:', err)
    }
  }, [])

  const assignMemberToCard = useCallback(
    async (cardId: string, userId: string): Promise<AssignmentActionResult> => {
      try {
        const { data, error: rpcError } = await supabase.rpc('assign_member_to_card', {
          target_card_id: cardId,
          target_user_id: userId,
        })

        if (rpcError) throw rpcError

        const result = data as AssignmentActionResult

        if (result.success) {
          await fetchCardAssignments(cardId)
        }

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al asignar miembro'
        console.error('assignMemberToCard error:', err)
        return { success: false, message }
      }
    },
    [fetchCardAssignments]
  )

  const unassignMemberFromCard = useCallback(
    async (cardId: string, userId: string): Promise<AssignmentActionResult> => {
      try {
        const { data, error: rpcError } = await supabase.rpc('unassign_member_from_card', {
          target_card_id: cardId,
          target_user_id: userId,
        })

        if (rpcError) throw rpcError

        const result = data as AssignmentActionResult

        if (result.success) {
          await fetchCardAssignments(cardId)
        }

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al desasignar miembro'
        console.error('unassignMemberFromCard error:', err)
        return { success: false, message }
      }
    },
    [fetchCardAssignments]
  )

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Comentarios en cards
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const fetchCardComments = useCallback(async (cardId: string) => {
    if (!cardId) return

    try {
      const { data, error: rpcError } = await supabase.rpc('get_card_comments', {
        target_card_id: cardId,
      })

      if (rpcError) throw rpcError

      setCommentsByCardId((prev) => ({
        ...prev,
        [cardId]: (data ?? []) as CommentWithAuthor[],
      }))
    } catch (err) {
      console.error('fetchCardComments error:', err)
    }
  }, [])

  const addCardComment = useCallback(
    async (cardId: string, content: string): Promise<CommentActionResult> => {
      try {
        const { data, error: rpcError } = await supabase.rpc('add_card_comment', {
          target_card_id: cardId,
          comment_content: content,
        })

        if (rpcError) throw rpcError

        const result = data as CommentActionResult

        if (result.success) {
          await fetchCardComments(cardId)
        }

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al agregar comentario'
        console.error('addCardComment error:', err)
        return { success: false, message }
      }
    },
    [fetchCardComments]
  )

  const deleteCardComment = useCallback(
    async (cardId: string, commentId: string): Promise<CommentActionResult> => {
      try {
        const { data, error: rpcError } = await supabase.rpc('delete_card_comment', {
          target_comment_id: commentId,
        })

        if (rpcError) throw rpcError

        const result = data as CommentActionResult

        if (result.success) {
          await fetchCardComments(cardId)
        }

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar comentario'
        console.error('deleteCardComment error:', err)
        return { success: false, message }
      }
    },
    [fetchCardComments]
  )

  return (
    <BoardDetailContext.Provider
      value={{
        lists,
        loading,
        error,
        boardWorkspaceId,
        assignmentsByCardId,
        commentsByCardId,
        createList,
        deleteList,
        createCard,
        updateCard,
        deleteCard,
        moveCard,
        fetchCardAssignments,
        assignMemberToCard,
        unassignMemberFromCard,
        fetchCardComments,
        addCardComment,
        deleteCardComment,
        refetch: fetchLists,
      }}
    >
      {children}
    </BoardDetailContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBoardDetail() {
  const context = useContext(BoardDetailContext)
  if (context === undefined) {
    throw new Error('useBoardDetail debe usarse dentro de BoardDetailProvider')
  }
  return context
}