import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
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

// Tiempo relativo simple ("hace 2 min", "hace 3 horas", "ayer", "hace 5 días")
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

function roleBadgeColor(role: WorkspaceRole): string {
  if (role === 'owner') return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  if (role === 'admin') return 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  return 'bg-slate-500/20 text-slate-300 border-slate-500/40'
}

export default function EditCardModal({ card, onClose }: Props) {
  const { user } = useAuth()
  const {
    updateCard,
    boardWorkspaceId,
    assignmentsByCardId,
    assignMemberToCard,
    unassignMemberFromCard,
    commentsByCardId,
    fetchCardComments,
    addCardComment,
    deleteCardComment,
  } = useBoardDetail()
  const { members, fetchMembers, currentUserRole } = useMembers()

  // Estados del formulario base
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [dueDate, setDueDate] = useState(toDateInputValue(card.due_date))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Estados de asignaciones
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignFeedback, setAssignFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Estados de comentarios
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentFeedback, setCommentFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Cargar miembros + comentarios al abrir el modal
  useEffect(() => {
    if (boardWorkspaceId) {
      fetchMembers(boardWorkspaceId)
    }
    fetchCardComments(card.id)
  }, [boardWorkspaceId, fetchMembers, fetchCardComments, card.id])

  const currentAssignments = assignmentsByCardId[card.id] ?? []
  const currentComments = commentsByCardId[card.id] ?? []
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

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newComment.trim()
    if (!trimmed) return

    setCommentLoading(true)
    setCommentFeedback(null)

    const result = await addCardComment(card.id, trimmed)

    if (result.success) {
      setNewComment('')
      // Scroll al final después del refetch
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 200)
    } else {
      setCommentFeedback({ type: 'error', message: result.message })
    }

    setCommentLoading(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = window.confirm('¿Eliminar este comentario? No se puede deshacer.')
    if (!confirmed) return

    setDeletingCommentId(commentId)
    setCommentFeedback(null)

    const result = await deleteCardComment(card.id, commentId)
    if (!result.success) {
      setCommentFeedback({ type: 'error', message: result.message })
    }

    setDeletingCommentId(null)
  }

  // ¿Puede borrar este comentario? (autor o owner/admin del workspace)
  const canDeleteComment = (commentUserId: string): boolean => {
    if (commentUserId === user?.id) return true
    if (currentUserRole === 'owner' || currentUserRole === 'admin') return true
    return false
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

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* SECCIÓN DE ASIGNADOS */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="pt-2 border-t border-slate-700">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              👥 Asignados {currentAssignments.length > 0 && `(${currentAssignments.length})`}
            </label>

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

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* SECCIÓN DE COMENTARIOS */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="pt-2 border-t border-slate-700">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              💬 Comentarios {currentComments.length > 0 && `(${currentComments.length})`}
            </label>

            {/* Lista de comentarios */}
            {currentComments.length > 0 ? (
              <ul className="space-y-3 mb-3 max-h-64 overflow-y-auto pr-1">
                {currentComments.map((c) => {
                  const isMine = c.user_id === user?.id
                  const canDelete = canDeleteComment(c.user_id)
                  return (
                    <li
                      key={c.comment_id}
                      className={`rounded-md border px-3 py-2 ${
                        isMine
                          ? 'bg-sky-500/5 border-sky-500/30'
                          : 'bg-slate-900/60 border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${roleBadgeColor(c.role)}`}
                          >
                            {roleEmoji(c.role)}
                          </span>
                          <span className="truncate text-xs font-medium text-slate-200">
                            {c.email}
                            {isMine && <span className="text-slate-500 ml-1">(vos)</span>}
                          </span>
                          <span className="text-xs text-slate-500 shrink-0">· {timeAgo(c.created_at)}</span>
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.comment_id)}
                            disabled={deletingCommentId === c.comment_id}
                            className="text-rose-300 hover:text-rose-200 text-xs px-2 py-0.5 rounded hover:bg-rose-500/10 transition shrink-0 disabled:opacity-50"
                            title="Eliminar comentario"
                          >
                            {deletingCommentId === c.comment_id ? '...' : '🗑'}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-white whitespace-pre-wrap break-words">{c.content}</p>
                    </li>
                  )
                })}
                <div ref={commentsEndRef} />
              </ul>
            ) : (
              <p className="text-xs text-slate-500 mb-3 italic">No hay comentarios todavía</p>
            )}

            {/* Form para agregar comentario */}
            <div className="flex gap-2 items-start">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                placeholder="Escribí un comentario..."
                maxLength={2000}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={commentLoading || !newComment.trim()}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-md transition disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
              >
                {commentLoading ? '...' : 'Enviar'}
              </button>
            </div>

            {commentFeedback && (
              <div className="mt-2 text-xs rounded-md px-3 py-2 border bg-rose-500/10 border-rose-500/40 text-rose-300">
                {commentFeedback.message}
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