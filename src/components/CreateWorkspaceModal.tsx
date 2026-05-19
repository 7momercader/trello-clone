import { useState, type FormEvent } from 'react'
import { useWorkspaces } from '../context/WorkspacesContext'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function CreateWorkspaceModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { createWorkspace } = useWorkspaces()

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (name.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres')
      return
    }

    setLoading(true)
    const { error: createError } = await createWorkspace(
      name.trim(),
      description.trim() || undefined
    )

    if (createError) {
      setError(createError.message)
      setLoading(false)
    } else {
      // Limpiar el formulario y cerrar
      setName('')
      setDescription('')
      setLoading(false)
      onClose()
    }
  }

  const handleClose = () => {
    if (loading) return
    setName('')
    setDescription('')
    setError(null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Nuevo Workspace</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="Ej: Mi Empresa"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Descripción <span className="text-slate-500 text-xs">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Describí brevemente este workspace..."
              maxLength={200}
            />
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
              {loading ? 'Creando...' : 'Crear workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}