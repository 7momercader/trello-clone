import { useState } from 'react'
import { useBoardDetail } from '../context/BoardDetailContext'
import type { Card } from '../types/database'
import EditCardModal from './EditCardModal'

interface Props {
  card: Card
}

export default function CardItem({ card }: Props) {
  const { deleteCard } = useBoardDetail()
  const [isEditing, setIsEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = window.confirm(
      `¿Eliminar la tarjeta "${card.title}"?`
    )
    if (!confirmed) return

    setDeleting(true)
    await deleteCard(card.id)
  }

  // Formatear fecha de vencimiento si existe
  const dueDateFormatted = card.due_date
    ? new Date(card.due_date).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
      })
    : null

  // Detectar si la fecha está vencida (en el pasado)
  const isOverdue = card.due_date
    ? new Date(card.due_date) < new Date()
    : false

  return (
    <>
      <div
        onClick={() => setIsEditing(true)}
        className="bg-white rounded-md shadow-sm p-2.5 cursor-pointer hover:shadow-md hover:ring-2 hover:ring-blue-400 transition group"
      >
        <div className="flex justify-between items-start gap-2">
          <p className="text-sm text-slate-800 flex-1 break-words">
            {card.title}
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
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

      {/* Modal de edición */}
      {isEditing && (
        <EditCardModal
          card={card}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  )
}