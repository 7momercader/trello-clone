import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useBoardDetail } from '../context/BoardDetailContext'

interface Props {
  listId: string
  onClose: () => void
}

export default function AddCardForm({ listId, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createCard } = useBoardDetail()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus automático
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (title.trim().length < 1) {
      setError('Escribí un título')
      return
    }

    setLoading(true)
    const { error: createError } = await createCard(listId, title.trim())

    if (createError) {
      setError(createError.message)
      setLoading(false)
    } else {
      // Limpiar el título pero NO cerrar — para crear varias seguidas
      setTitle('')
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  // Enter para enviar, Shift+Enter para nueva línea, Escape para cerrar
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        ref={textareaRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribí el título de la tarjeta..."
        rows={2}
        maxLength={200}
        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
      />

      {error && (
        <p className="text-red-600 text-xs">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Agregar tarjeta'}
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