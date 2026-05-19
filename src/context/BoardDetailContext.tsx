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
import type { List, Card, ListWithCards } from '../types/database'

interface BoardDetailContextType {
  lists: ListWithCards[]
  loading: boolean
  error: string | null
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar lists con sus cards desde Supabase
  const fetchLists = useCallback(async () => {
    if (!user || !boardId) {
      setLists([])
      setLoading(false)
      return
    }

    setError(null)

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
    setLoading(false)
  }, [user, boardId])

  // Carga inicial
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🆕 SUSCRIPCIÓN REALTIME
  // Escucha cambios en lists y cards y refresca los datos
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (!boardId || !user) return

    // Crear canal de suscripción
    const channel = supabase
      .channel(`board:${boardId}`)
      // Escuchar cambios en lists del board actual
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          // Cuando hay un cambio, recargamos las listas
          fetchLists()
        }
      )
      // Escuchar cambios en cards
      // (no podemos filtrar por board_id porque cards no tiene esa columna,
      // pero como recargamos todo, igual se refleja solo lo del board actual)
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
      .subscribe()

    // Cleanup: desuscribirse cuando el componente se desmonta o cambia boardId
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

  return (
    <BoardDetailContext.Provider
      value={{
        lists,
        loading,
        error,
        createList,
        deleteList,
        createCard,
        updateCard,
        deleteCard,
        moveCard,
        refetch: fetchLists,
      }}
    >
      {children}
    </BoardDetailContext.Provider>
  )
}

export function useBoardDetail() {
  const context = useContext(BoardDetailContext)
  if (context === undefined) {
    throw new Error('useBoardDetail debe usarse dentro de BoardDetailProvider')
  }
  return context
}