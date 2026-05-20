import { useState } from 'react'
import { useBoardDetail } from '../context/BoardDetailContext'
import type { Card, WorkspaceRole } from '../types/database'
import EditCardModal from './EditCardModal'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  card: Card
}

// Tiempo relativo simple para mostrar "hace X"
function timeAgo(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 30) return 'recién'
  if (diffMin < 1) return `hace ${diffSec} seg`
  if (diffHr < 1) return `hace ${diffMin} min`
  if (diffDay < 1) return `hace ${diffHr} h`
  if (diffDay < 7) return `hace ${diffDay} d`
  return date.toLocaleDateString('es-AR')
}

function roleEmoji(role: WorkspaceRole): string {
  if (role === 'owner') return '👑'
  if (role === 'admin') return '🛡️'
  return '👤'
}

function shortEmail(email: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex === -1) return email
  const local = email.slice(0, atIndex)
  if (local.length > 12) return local.slice(0, 11) + '…'
  return local
}

export default function CardItem({ card }: Props) {
  const { deleteCard, toggleCardCompleted, assignmentsByCardId } = useBoardDetail()
  const [isEditing, setIsEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [togglingCompleted, setTogglingCompleted] = useState(false)

  const cardAssignments = assignmentsByCardId[card.id] ?? []

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      listId: card.list_id,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = window.confirm(
      `¿Eliminar la tarjeta "${card.title}"?`
    )
    if (!confirmed) return

    setDeleting(true)
    await deleteCard(card.id)
  }

  const handleToggleCompleted = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (togglingCompleted) return

    setTogglingCompleted(true)
    await toggleCardCompleted(card.id, !card.is_completed)
    setTogglingCompleted(false)
  }

  const dueDateFormatted = card.due_date
    ? new Date(card.due_date).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
      })
    : null

  const isOverdue = card.due_date
    ? new Date(card.due_date) < new Date()
    : false

  const cardBgClass = card.is_completed
    ? 'bg-emerald-50 ring-1 ring-emerald-300/40'
    : 'bg-white'

  const titleClass = card.is_completed
    ? 'text-sm text-slate-500 line-through flex-1 break-words'
    : 'text-sm text-slate-800 flex-1 break-words'

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => setIsEditing(true)}
        className={`${cardBgClass} rounded-md shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:ring-2 hover:ring-blue-400 transition group`}
      >
        <div className="flex justify-between items-start gap-2">
          {/* Checkbox circular para marcar/desmarcar como completada */}
          <button
            type="button"
            onClick={handleToggleCompleted}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={togglingCompleted}
            title={card.is_completed ? 'Desmarcar como completada' : 'Marcar como completada'}
            className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-xs flex-shrink-0 transition ${
              card.is_completed
                ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
                : 'border-slate-400 text-transparent hover:border-emerald-500 hover:text-emerald-500'
            } ${togglingCompleted ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
          >
            ✓
          </button>

          <p className={titleClass}>
            {card.title}
          </p>

          {/* Botón eliminar — siempre visible en mobile, solo en hover en desktop */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-red-500 text-base sm:text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition disabled:opacity-50 flex-shrink-0 p-1 -m-1"
            title="Eliminar tarjeta"
          >
            {deleting ? '...' : '🗑'}
          </button>
        </div>

        {/* Descripción acortada */}
        {card.description && (
          <p className={`text-xs mt-1 line-clamp-2 ${
            card.is_completed ? 'text-slate-400 line-through' : 'text-slate-500'
          }`}>
            {card.description}
          </p>
        )}

        {/* Fecha de vencimiento */}
        {dueDateFormatted && (
          <div className="mt-2">
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded ${
                card.is_completed
                  ? 'bg-slate-100 text-slate-500'
                  : isOverdue
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-200 text-slate-700'
              }`}
            >
              📅 {dueDateFormatted}
            </span>
          </div>
        )}

        {/* Chips de asignados */}
        {cardAssignments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {cardAssignments.map((a) => (
              <span
                key={a.assignment_id}
                title={a.email}
                className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border ${
                  card.is_completed
                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
              >
                <span>{roleEmoji(a.role)}</span>
                <span>{shortEmail(a.email)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Sello de "Completada hace X" */}
        {card.is_completed && card.completed_at && (
          <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <span>✓</span>
            <span>Completada {timeAgo(card.completed_at)}</span>
          </div>
        )}
      </div>

      {isEditing && (
        <EditCardModal
          card={card}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  )
}