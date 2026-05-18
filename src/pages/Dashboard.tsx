import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
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
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Mis Workspaces</h2>
          <p className="text-slate-400 mb-8">
            Bienvenido, {user?.email}. Acá vas a ver tus espacios de trabajo y tableros.
          </p>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-400 mb-2">🚧 Próximamente</p>
            <p className="text-slate-500 text-sm">
              En la siguiente fase vamos a crear los workspaces, tableros, listas y tarjetas.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}