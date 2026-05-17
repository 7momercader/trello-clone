import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    async function testConnection() {
      try {
        const { error } = await supabase.auth.getSession()
        if (error) throw error
        setStatus('connected')
      } catch (err) {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Error desconocido')
      }
    }
    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 text-blue-400">
          Trello Clone
        </h1>
        <p className="text-slate-400 text-lg mb-6">Tailwind funcionando ✨</p>

        <div className="mt-8 p-4 rounded-lg border border-slate-700 bg-slate-800">
          <p className="text-sm text-slate-400 mb-2">Estado de Supabase:</p>
          {status === 'checking' && (
            <p className="text-yellow-400">⏳ Verificando conexión...</p>
          )}
          {status === 'connected' && (
            <p className="text-green-400">✅ Conectado a Supabase</p>
          )}
          {status === 'error' && (
            <p className="text-red-400">❌ Error: {errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default App