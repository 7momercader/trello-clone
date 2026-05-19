import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useBoardDetail } from '../context/BoardDetailContext'

interface Props {
  onClose: () => void
}

export default function AddListForm({ onClose }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createList } = useBoardDetail()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus automático al input cuando aparece el form
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (name.trim().length < 1) {
      setError('Escribí un nombre')
      return
    }

    setLoading(true)
    const { error: createError } = await createList(name.trim())

    if (createError) {
      setError(createError.message)
      setLoading(false)
    } else {
      // Limpiar y cerrar
      setName('')
      setLoading(false)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="bg-slate-100 rounded-md shadow-md p-2"
    >
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Por hacer"
        maxLength={50}
        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:border-blue-500"
      />

      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}

      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear lista'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-2 py-1.5 text-slate-600 hover:bg-slate-200 text-sm rounded-md transition disabled:opacity-50"
        >
          ×
        </button>
      </div>
    </form>
  )
}