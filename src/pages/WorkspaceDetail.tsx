import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWorkspaces } from '../context/WorkspacesContext'
import { useBoards } from '../context/BoardsContext'
import CreateBoardModal from '../components/CreateBoardModal'

export default function WorkspaceDetail() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { workspaces, loading: workspacesLoading } = useWorkspaces()
  const { boards, loading, error, deleteBoard } = useBoards()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Buscar el workspace actual para mostrar su nombre
  const currentWorkspace = workspaces.find((w) => w.id === workspaceId)

  // Si workspaces ya cargaron y el workspace no existe, redirigir al dashboard
  if (!workspacesLoading && !currentWorkspace) {
    return <Navigate to="/dashboard" replace />
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `¿Seguro que querés eliminar el tablero "${name}"? Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    setDeletingId(id)
    await deleteBoard(id)
    setDeletingId(null)
  }

  const handleOpenBoard = (boardId: string) => {
    navigate(`/board/${boardId}`)
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
        <div className="max-w-6xl mx-auto">
          {/* Botón volver + breadcrumb */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white text-sm transition flex items-center gap-1"
            >
              ← Volver a Workspaces
            </button>
          </div>

          {/* Header del workspace */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-1">
                {currentWorkspace?.name ?? 'Cargando...'}
              </h2>
              {currentWorkspace?.description && (
                <p className="text-slate-400">{currentWorkspace.description}</p>
              )}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition"
            >
              + Nuevo Tablero
            </button>
          </div>

          {/* Estados */}
          {loading && (
            <div className="text-center py-12 text-slate-400">
              Cargando tableros...
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-md p-4 mb-6">
              Error: {error}
            </div>
          )}

          {!loading && !error && boards.length === 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
              <p className="text-slate-300 text-lg mb-2">
                Este workspace todavía no tiene tableros
              </p>
              <p className="text-slate-500 text-sm mb-6">
                Creá tu primer tablero para empezar a organizar tareas.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition"
              >
                + Crear mi primer tablero
              </button>
            </div>
          )}

          {/* Grilla de boards */}
          {!loading && boards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => handleOpenBoard(board.id)}
                  className="relative rounded-lg p-5 h-32 cursor-pointer hover:opacity-90 transition group shadow-lg"
                  style={{ backgroundColor: board.background_color }}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white drop-shadow-md">
                      {board.name}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(board.id, board.name)
                      }}
                      disabled={deletingId === board.id}
                      className="text-white/70 hover:text-white text-sm opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                      title="Eliminar tablero"
                    >
                      {deletingId === board.id ? '...' : '🗑'}
                    </button>
                  </div>
                  {board.description && (
                    <p className="text-white/80 text-sm mt-2 line-clamp-2 drop-shadow">
                      {board.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateBoardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}