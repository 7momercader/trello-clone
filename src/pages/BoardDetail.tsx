import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBoardDetail } from '../context/BoardDetailContext'
import { supabase } from '../lib/supabase'
import type { Board } from '../types/database'
import ListColumn from '../components/ListColumn'
import AddListForm from '../components/AddListForm'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'

export default function BoardDetail() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { lists, loading, error, moveCard } = useBoardDetail()
  const [isAddingList, setIsAddingList] = useState(false)

  // Cargar el board directamente desde Supabase
  const [board, setBoard] = useState<Board | null>(null)
  const [boardLoading, setBoardLoading] = useState(true)
  const [boardNotFound, setBoardNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadBoard = async () => {
      if (!boardId) return

      const { data, error: fetchError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single()

      if (cancelled) return

      if (fetchError || !data) {
        setBoardNotFound(true)
      } else {
        setBoard(data)
      }
      setBoardLoading(false)
    }

    loadBoard()

    return () => {
      cancelled = true
    }
  }, [boardId])

  // Sensores de drag: necesitamos mover al menos 8px para activar el drag
  // (evita que un click simple en una tarjeta se confunda con un drag)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Manejador principal: se ejecuta cuando soltás una tarjeta
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId === overId) return

    let sourceListId: string | undefined
    for (const list of lists) {
      if (list.cards.some((c) => c.id === activeId)) {
        sourceListId = list.id
        break
      }
    }

    if (!sourceListId) return

    let targetListId: string | undefined
    let newPosition = 0

    const overIsList = lists.some((l) => l.id === overId)

    if (overIsList) {
      targetListId = overId
      const targetList = lists.find((l) => l.id === targetListId)
      newPosition = targetList?.cards.length ?? 0
    } else {
      for (const list of lists) {
        const cardIndex = list.cards.findIndex((c) => c.id === overId)
        if (cardIndex !== -1) {
          targetListId = list.id
          newPosition = cardIndex
          break
        }
      }
    }

    if (!targetListId) return

    moveCard(activeId, targetListId, newPosition)
  }

  if (!boardLoading && boardNotFound) {
    return <Navigate to="/dashboard" replace />
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const bgColor = board?.background_color ?? '#475569'

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: bgColor }}
    >
      {/* Header — compacto en mobile, espaciado en desktop */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-3 sm:px-6 py-2 sm:py-3">
        {/* Fila 1: Volver + Título */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              onClick={() =>
                board
                  ? navigate(`/workspace/${board.workspace_id}`)
                  : navigate('/dashboard')
              }
              className="text-white/80 hover:text-white text-sm transition flex-shrink-0"
              title="Volver"
            >
              ← <span className="hidden sm:inline">Volver</span>
            </button>
            <h1 className="text-base sm:text-xl font-bold text-white drop-shadow truncate">
              {board?.name ?? 'Cargando...'}
            </h1>
          </div>

          {/* Acciones derechas: email (solo desktop) + cerrar sesión */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <span className="hidden md:inline text-sm text-white/80 truncate max-w-[180px]">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-xs sm:text-sm text-white transition whitespace-nowrap"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Estados de carga / error */}
      {(loading || boardLoading) && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/80">Cargando tablero...</p>
        </div>
      )}

      {error && (
        <div className="m-6 bg-red-500/20 border border-red-400 text-white rounded-md p-4">
          Error: {error}
        </div>
      )}

      {/* Tablero Kanban con DnD */}
      {!loading && !boardLoading && !error && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <main className="flex-1 overflow-x-auto overflow-y-hidden p-3 sm:p-6">
            <div className="flex gap-3 sm:gap-4 items-start h-full">
              {lists.map((list) => (
                <ListColumn key={list.id} list={list} />
              ))}

              <div className="flex-shrink-0 w-72">
                {isAddingList ? (
                  <AddListForm onClose={() => setIsAddingList(false)} />
                ) : (
                  <button
                    onClick={() => setIsAddingList(true)}
                    className="w-full bg-white/20 hover:bg-white/30 text-white rounded-md py-3 px-4 text-left text-sm font-medium transition backdrop-blur-sm"
                  >
                    + Agregar otra lista
                  </button>
                )}
              </div>
            </div>
          </main>
        </DndContext>
      )}
    </div>
  )
}