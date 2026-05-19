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

  // 🆕 Sensores de drag: necesitamos mover al menos 8px para activar el drag
  // (evita que un click simple en una tarjeta se confunda con un drag)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // 🆕 Manejador principal: se ejecuta cuando soltás una tarjeta
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    // active = lo que estabas arrastrando
    // over = sobre lo que lo soltaste (puede ser una card u otra lista)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId === overId) return

    // Encontrar la card activa (la que se arrastró)
    let sourceListId: string | undefined
    for (const list of lists) {
      if (list.cards.some((c) => c.id === activeId)) {
        sourceListId = list.id
        break
      }
    }

    if (!sourceListId) return

    // Determinar la lista destino y la nueva posición
    // Caso 1: soltaste sobre otra card → la lista destino es la lista de esa card
    // Caso 2: soltaste sobre una lista vacía → over.id es el id de la lista
    let targetListId: string | undefined
    let newPosition = 0

    // ¿over es una lista directamente (drop en área vacía)?
    const overIsList = lists.some((l) => l.id === overId)

    if (overIsList) {
      targetListId = overId
      // Si la lista está vacía, posición 0
      const targetList = lists.find((l) => l.id === targetListId)
      newPosition = targetList?.cards.length ?? 0
    } else {
      // over es una card → encontrar su lista y posición
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

    // Llamar al Context para hacer el cambio
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
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              board
                ? navigate(`/workspace/${board.workspace_id}`)
                : navigate('/dashboard')
            }
            className="text-white/80 hover:text-white text-sm transition"
          >
            ← Volver
          </button>
          <h1 className="text-xl font-bold text-white drop-shadow">
            {board?.name ?? 'Cargando...'}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/80">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm text-white transition"
          >
            Cerrar sesión
          </button>
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
          <main className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            <div className="flex gap-4 items-start h-full">
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