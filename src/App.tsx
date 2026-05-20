import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { BoardsProvider } from './context/BoardsContext'
import { BoardDetailProvider } from './context/BoardDetailContext'
import { MembersProvider } from './context/MembersContext'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import WorkspaceDetail from './pages/WorkspaceDetail'
import BoardDetail from './pages/BoardDetail'

// Puente: lee workspaceId de la URL y lo pasa a BoardsProvider
function WorkspaceRoute() {
  const { workspaceId } = useParams<{ workspaceId: string }>()

  if (!workspaceId) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <BoardsProvider workspaceId={workspaceId}>
      <WorkspaceDetail />
    </BoardsProvider>
  )
}

// Puente: lee boardId de la URL y lo pasa a BoardDetailProvider
function BoardRoute() {
  const { boardId } = useParams<{ boardId: string }>()

  if (!boardId) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <BoardDetailProvider boardId={boardId}>
      <BoardDetail />
    </BoardDetailProvider>
  )
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-slate-400">Cargando...</p>
      </div>
    )
  }

  // Si el usuario está logueado, envolvemos todo con MembersProvider
  // para que cualquier ruta protegida pueda acceder a la lista de miembros
  const protectedRoutes = (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/workspace/:workspaceId" element={<WorkspaceRoute />} />
      <Route path="/board/:boardId" element={<BoardRoute />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )

  const publicRoutes = (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )

  return user ? (
    <MembersProvider>{protectedRoutes}</MembersProvider>
  ) : (
    publicRoutes
  )
}

export default App