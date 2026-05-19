import { useState, type FormEvent } from 'react'
import { useBoardDetail } from '../context/BoardDetailContext'
import type { Card } from '../types/database'

interface Props {
  card: Card
  onClose: () => void
}

// Convierte un timestamp ISO a formato "YYYY-MM-DD" para el input date
function toDateInputValue(isoString: string | null): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function EditCardModal({ card, onClose }: Props) {
  const { updateCard } = useBoardDetail()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [dueDate, setDueDate] = useState(toDateInputValue(card.due_date))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (title.trim().length < 1) {
      setError('El título no puede estar vacío')
      return
    }

    setLoading(true)

    // Convertir la fecha a ISO o null
    const dueDateISO = dueDate ? new Date(dueDate).toISOString() : null

    const { error: updateError } = await updateCard(card.id, {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDateISO,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      setLoading(false)
      onClose()
    }
  }

  const handleClose = () => {
    if (loading) return
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Editar Tarjeta</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              maxLength={200}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Descripción <span className="text-slate-500 text-xs">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Agregá una descripción más detallada..."
              maxLength={1000}
            />
          </div>

          {/* Fecha de vencimiento */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Fecha de vencimiento <span className="text-slate-500 text-xs">(opcional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="px-3 py-2 text-slate-400 hover:text-white text-sm transition"
                  title="Quitar fecha"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 text-sm rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-md transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}