import { useState, useEffect, type FormEvent } from 'react'
import { useBoardDetail } from '../context/BoardDetailContext'
import { useMembers } from '../context/MembersContext'
import type { Card, WorkspaceRole } from '../types/database'

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

// Helpers para mostrar roles
function roleEmoji(role: WorkspaceRole): string {
  if (role === 'owner') return '👑'
  if (role === 'admin') return '🛡️'
  return '👤'
}

function roleBadgeColor(role: WorkspaceRole): string {
  if (role === 'owner') return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  if (role === 'admin') return 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  return 'bg-slate-500/20 text-slate-300 border-slate-500/40'
}

export default function EditCardModal({ card, onClose }: Props) {
  const {
    updateCard,
    boardWorkspaceId,
    assignmentsByCardId,
    assignMemberToCard,
    unassignMemberFromCard,
  } = useBoardDetail()
  const { members, fetchMembers } = useMembers()

  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [dueDate, setDueDate] = useState(toDateInputValue(card.due_date))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Estado para el selector de "Asignar miembro"
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignFeedback, setAssignFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Cargar miembros del workspace al abrir el modal
  useEffect(() => {
    if (boardWorkspaceId) {
      fetchMembers(boardWorkspaceId)
    }
  }, [boardWorkspaceId, fetchMembers])

  // Lista de asignados actuales de esta card
  const currentAssignments = assignmentsByCardId[card.id] ?? []

  // Miembros del workspace que TODAVÍA no están asignados (para mostrar en el dropdown)
  const availableMembers = members.filter(
    (m) => !currentAssignments.some((a) => a.user_id === m.user_id)
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (title.trim().length < 1) {
      setError('El título no puede estar vacío')
      return
    }

    setLoading(true)

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

  const handleAssign = async () => {
    if (!selectedUserId) return

    setAssignLoading(true)
    setAssignFeedback(null)

    const result = await assignMemberToCard(card.id, selectedUserId)

    if (result.success) {
      setAssignFeedback({ type: 'success', message: 'Miembro asignado' })
      setSelectedUserId('')
    } else {
      setAssignFeedback({ type: 'error', message: result.message })
    }

    setAssignLoading(false)
  }

  const handleUnassign = async (userId: string) => {
    setAssignFeedback(null)
    const result = await unassignMemberFromCard(card.id, userId)
    if (!result.success) {
      setAssignFeedback({ type: 'error', message: result.message })
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800 z-10">
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

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* SECCIÓN DE ASIGNADOS */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="pt-2 border-t border-slate-700">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              👥 Asignados {currentAssignments.length > 0 && `(${currentAssignments.length})`}
            </label>

            {/* Lista de asignados actuales */}
            {currentAssignments.length > 0 ? (
              <ul className="space-y-2 mb-3">
                {currentAssignments.map((a) => (
                  <li
                    key={a.assignment_id}
                    className="flex items-center justify-between gap-2 rounded-md bg-slate-900/60 border border-slate-700 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${roleBadgeColor(a.role)}`}
                      >
                        {roleEmoji(a.role)}
                      </span>
                      <span className="truncate text-sm text-white">{a.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnassign(a.user_id)}
                      className="text-rose-300 hover:text-rose-200 text-xs px-2 py-1 rounded hover:bg-rose-500/10 transition shrink-0"
                      title="Quitar asignación"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 mb-3 italic">Nadie asignado todavía</p>
            )}

            {/* Selector + botón para asignar nuevo miembro */}
            {availableMembers.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={assignLoading}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Seleccionar miembro...</option>
                  {availableMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {roleEmoji(m.role)} {m.email}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={!selectedUserId || assignLoading}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-md transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {assignLoading ? '...' : 'Asignar'}
                </button>
              </div>
            ) : currentAssignments.length > 0 ? (
              <p className="text-xs text-slate-500 italic">Todos los miembros del workspace están asignados</p>
            ) : (
              <p className="text-xs text-slate-500 italic">No hay miembros disponibles en el workspace</p>
            )}

            {/* Mensaje de feedback de la asignación */}
            {assignFeedback && (
              <div
                className={`mt-2 text-xs rounded-md px-3 py-2 border ${
                  assignFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                }`}
              >
                {assignFeedback.message}
              </div>
            )}
          </div>

          {/* Error general del formulario */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 text-sm rounded-md p-3">
              {error}
            </div>
          )}

          {/* Botones */}
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