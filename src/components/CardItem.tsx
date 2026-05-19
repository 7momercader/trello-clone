import { useState } from 'react'
import { useBoardDetail } from '../context/BoardDetailContext'
import type { Card } from '../types/database'
import EditCardModal from './EditCardModal'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  card: Card
}

export default function CardItem({ card }: Props) {
  const { deleteCard } = useBoardDetail()
  const [isEditing, setIsEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 🆕 Hook de @dnd-kit que hace que la card sea arrastrable
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

  // 🆕 Estilos dinámicos: aplicar la transformación que calcula @dnd-kit
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

  const dueDateFormatted = card.due_date
    ? new Date(card.due_date).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
      })
    : null

  const isOverdue = card.due_date
    ? new Date(card.due_date) < new Date()
    : false

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => setIsEditing(true)}
        className="bg-white rounded-md shadow-sm p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:ring-2 hover:ring-blue-400 transition group"
      >
        <div className="flex justify-between items-start gap-2">
          <p className="text-sm text-slate-800 flex-1 break-words">
            {card.title}
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition disabled:opacity-50 flex-shrink-0"
            title="Eliminar tarjeta"
          >
            {deleting ? '...' : '🗑'}
          </button>
        </div>

        {/* Descripción acortada */}
        {card.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {card.description}
          </p>
        )}

        {/* Fecha de vencimiento */}
        {dueDateFormatted && (
          <div className="mt-2">
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded ${
                isOverdue
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              📅 {dueDateFormatted}
            </span>
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