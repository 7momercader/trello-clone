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

// Puente: lee workspaceId de la URL y lo pasa a BoardsProvider + MembersProvider
function WorkspaceRoute() {
  const { workspaceId } = useParams<{ workspaceId: string }>()

  if (!workspaceId) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <MembersProvider>
      <BoardsProvider workspaceId={workspaceId}>
        <WorkspaceDetail />
      </BoardsProvider>
    </MembersProvider>
  )
}

// Puente: lee boardId de la URL y lo pasa a BoardDetailProvider
// Necesita BoardsProvider arriba para mostrar el nombre del board
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

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/dashboard" replace /> : <SignUp />}
      />

      {/* Rutas protegidas */}
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/workspace/:workspaceId"
        element={user ? <WorkspaceRoute /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/board/:boardId"
        element={user ? <BoardRoute /> : <Navigate to="/login" replace />}
      />

      {/* Ruta por defecto */}
      <Route
        path="/"
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
      />

      {/* 404: cualquier otra ruta */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

export default App