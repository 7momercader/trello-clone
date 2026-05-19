import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useWorkspaces } from '../context/WorkspacesContext'
import CreateWorkspaceModal from '../components/CreateWorkspaceModal'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { workspaces, loading, error, deleteWorkspace } = useWorkspaces()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `¿Seguro que querés eliminar el workspace "${name}"? Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    setDeletingId(id)
    await deleteWorkspace(id)
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-400">Trello Clone</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm transition"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Mis Workspaces</h2>
              <p className="text-slate-400">
                Bienvenido, {user?.email}
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition"
            >
              + Nuevo Workspace
            </button>
          </div>

          {loading && (
            <div className="text-center py-12 text-slate-400">
              Cargando workspaces...
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-md p-4 mb-6">
              Error: {error}
            </div>
          )}

          {!loading && !error && workspaces.length === 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
              <p className="text-slate-300 text-lg mb-2">
                Todavía no tenés workspaces
              </p>
              <p className="text-slate-500 text-sm mb-6">
                Creá tu primer workspace para empezar a organizar tus proyectos.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition"
              >
                + Crear mi primer workspace
              </button>
            </div>
          )}

          {!loading && workspaces.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-blue-500 transition group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">
                      {workspace.name}
                    </h3>
                    <button
                      onClick={() => handleDelete(workspace.id, workspace.name)}
                      disabled={deletingId === workspace.id}
                      className="text-slate-500 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                      title="Eliminar workspace"
                    >
                      {deletingId === workspace.id ? '...' : '🗑'}
                    </button>
                  </div>
                  {workspace.description && (
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                      {workspace.description}
                    </p>
                  )}
                  <p className="text-slate-500 text-xs">
                    Creado: {new Date(workspace.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}