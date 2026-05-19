import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMembers } from '../context/MembersContext'
import type { WorkspaceRole } from '../types/database'

interface ManageMembersModalProps {
  workspaceId: string
  workspaceName: string
  isOpen: boolean
  onClose: () => void
}

// ============================================
// Helpers para mostrar el rol con emoji y label
// ============================================
function roleLabel(role: WorkspaceRole): string {
  if (role === 'owner') return 'Owner'
  if (role === 'admin') return 'Admin'
  return 'Member'
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

// ============================================
// Componente principal
// ============================================
export default function ManageMembersModal({
  workspaceId,
  workspaceName,
  isOpen,
  onClose,
}: ManageMembersModalProps) {
  const { user } = useAuth()
  const {
    members,
    loading,
    error,
    currentUserRole,
    fetchMembers,
    addMember,
    removeMember,
  } = useMembers()

  // Estado local del formulario de invitación
  const [emailInput, setEmailInput] = useState('')
  const [roleInput, setRoleInput] = useState<'admin' | 'member'>('member')
  const [addingMember, setAddingMember] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)

  // Cargar miembros cuando se abre el modal
  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchMembers(workspaceId)
      setFeedback(null)
    }
  }, [isOpen, workspaceId, fetchMembers])

  // Si no está abierto, no renderizamos nada
  if (!isOpen) return null

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin'

  // --------------------------------------------
  // Handler: agregar miembro
  // --------------------------------------------
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    const trimmedEmail = emailInput.trim()

    if (!trimmedEmail) {
      setFeedback({ type: 'error', message: 'Ingresá un email' })
      return
    }

    setAddingMember(true)
    setFeedback(null)

    const result = await addMember(workspaceId, trimmedEmail, roleInput)

    if (result.success) {
      setFeedback({ type: 'success', message: result.message })
      setEmailInput('')
      setRoleInput('member')
    } else {
      setFeedback({ type: 'error', message: result.message })
    }

    setAddingMember(false)
  }

  // --------------------------------------------
  // Handler: eliminar miembro
  // --------------------------------------------
  async function handleRemoveMember(userId: string, email: string) {
    const isSelf = userId === user?.id
    const confirmMessage = isSelf
      ? `¿Estás seguro de que querés salir del workspace "${workspaceName}"?`
      : `¿Estás seguro de que querés quitar a ${email} del workspace?`

    if (!window.confirm(confirmMessage)) return

    setRemovingUserId(userId)
    setFeedback(null)

    const result = await removeMember(workspaceId, userId)

    if (result.success) {
      setFeedback({ type: 'success', message: result.message })
      // Si me saqué a mí mismo, cierro el modal
      if (isSelf) {
        setTimeout(() => onClose(), 1000)
      }
    } else {
      setFeedback({ type: 'error', message: result.message })
    }

    setRemovingUserId(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-slate-800 shadow-2xl border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            👥 Miembros de "{workspaceName}"
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white transition"
            aria-label="Cerrar"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Tu rol */}
          {currentUserRole && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span>Tu rol:</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleBadgeColor(currentUserRole)}`}
              >
                {roleEmoji(currentUserRole)} {roleLabel(currentUserRole)}
              </span>
            </div>
          )}

          {/* Formulario para agregar miembros */}
          {canManageMembers && (
            <form onSubmit={handleAddMember} className="space-y-3">
              <label className="block text-sm font-medium text-slate-200">
                Agregar miembro
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  disabled={addingMember}
                />
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as 'admin' | 'member')}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  disabled={addingMember}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={addingMember || !emailInput.trim()}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 transition"
                >
                  {addingMember ? 'Agregando...' : '+ Agregar'}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                La persona debe haberse registrado previamente en la app.
              </p>
            </form>
          )}

          {/* Mensaje de feedback */}
          {feedback && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Lista de miembros */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-200">
              Miembros actuales {members.length > 0 && `(${members.length})`}
            </h3>

            {loading && (
              <p className="text-sm text-slate-400 py-4 text-center">Cargando miembros...</p>
            )}

            {error && !loading && (
              <p className="text-sm text-rose-400 py-4 text-center">{error}</p>
            )}

            {!loading && !error && members.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">
                No hay miembros para mostrar
              </p>
            )}

            {!loading && !error && members.length > 0 && (
              <ul className="space-y-2">
                {members.map((m) => {
                  const isSelf = m.user_id === user?.id
                  const canRemoveThisMember =
                    m.role !== 'owner' &&
                    (isSelf ||
                      currentUserRole === 'owner' ||
                      (currentUserRole === 'admin' && m.role === 'member'))

                  return (
                    <li
                      key={m.member_id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${roleBadgeColor(m.role)}`}
                        >
                          {roleEmoji(m.role)} {roleLabel(m.role)}
                        </span>
                        <span className="truncate text-sm text-white">
                          {m.email}
                          {isSelf && <span className="text-slate-400 ml-1">(vos)</span>}
                        </span>
                      </div>

                      {canRemoveThisMember && (
                        <button
                          onClick={() => handleRemoveMember(m.user_id, m.email)}
                          disabled={removingUserId === m.user_id}
                          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition shrink-0"
                        >
                          {removingUserId === m.user_id
                            ? '...'
                            : isSelf
                              ? 'Salir'
                              : 'Sacar'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}