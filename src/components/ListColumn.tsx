import { useState } from 'react'
import { useBoardDetail } from '../context/BoardDetailContext'
import type { ListWithCards } from '../types/database'
import CardItem from './CardItem'
import AddCardForm from './AddCardForm'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'

interface Props {
  list: ListWithCards
}

export default function ListColumn({ list }: Props) {
  const { deleteList } = useBoardDetail()
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 🆕 Hacer la lista entera "droppable" — para poder soltar cards
  // incluso si la lista está vacía
  const { setNodeRef } = useDroppable({
    id: list.id,
    data: {
      type: 'list',
    },
  })

  const handleDeleteList = async () => {
    const confirmed = window.confirm(
      `¿Seguro que querés eliminar la lista "${list.name}" y todas sus tarjetas? Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    setDeleting(true)
    await deleteList(list.id)
  }

  return (
    <div className="flex-shrink-0 w-72 bg-slate-100 rounded-md shadow-md flex flex-col max-h-[calc(100vh-10rem)]">
      {/* Header de la lista */}
      <div className="flex justify-between items-center px-3 pt-3 pb-2 group">
        <h3 className="font-semibold text-slate-800 text-sm flex-1">
          {list.name}
        </h3>
        <button
          onClick={handleDeleteList}
          disabled={deleting}
          className="text-slate-500 hover:text-red-500 text-sm opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
          title="Eliminar lista"
        >
          {deleting ? '...' : '🗑'}
        </button>
      </div>

      {/* 🆕 Cards (sortables y droppables) */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-2 py-1 space-y-2 min-h-[40px]"
      >
        <SortableContext
          items={list.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>

      {/* Botón / formulario para agregar tarjeta */}
      <div className="px-2 pb-2 pt-1">
        {isAddingCard ? (
          <AddCardForm
            listId={list.id}
            onClose={() => setIsAddingCard(false)}
          />
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className="w-full text-left text-sm text-slate-600 hover:bg-slate-200 rounded-md py-2 px-2 transition"
          >
            + Agregar tarjeta
          </button>
        )}
      </div>
    </div>
  )
}