import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Card } from '../../types/database'

export default function CardDecksTab({ cards }: { cards: Card[] }) {
  const [newContent, setNewContent] = useState('')
  const [pendingCard, setPendingCard] = useState<Card | null>(null)

  const chanceCards = cards.filter(c => c.deck_type === 'chance')

  const addCard = async () => {
    const content = newContent.trim()
    if (!content) return
    await supabase.from('cards').insert({ deck_type: 'chance', content })
    setNewContent('')
  }

  const deleteCard = async (id: string) => {
    await supabase.from('cards').delete().eq('id', id)
  }

  const broadcastCard = async (card: Card) => {
    await supabase.channel('card_display').send({
      type: 'broadcast',
      event: 'show_card',
      payload: { title: card.title, content: card.content },
    })
    setPendingCard(null)
  }

  const rollRandom = () => {
    if (!chanceCards.length) return
    const card = chanceCards[Math.floor(Math.random() * chanceCards.length)]
    setPendingCard(card)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Card Decks</h2>

      <div className="bg-gray-800 rounded-xl p-4 border border-gray-600 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Chance Cards ({chanceCards.length})</h3>
          <button onClick={rollRandom}
            className="px-4 py-2 rounded font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500">
            🎲 Random
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCard()}
            placeholder="Add a chance card..."
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
          />
          <button onClick={addCard}
            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm">Add</button>
        </div>

        <ul className="space-y-1">
          {chanceCards.map(card => (
            <li
              key={card.id}
              className="flex gap-2 items-start text-sm bg-gray-700 px-3 py-2 rounded cursor-pointer hover:ring-2 hover:ring-indigo-400/50 transition-all"
              onClick={() => broadcastCard(card)}
            >
              <span className="flex-1">
                {card.title && <span className="font-semibold text-indigo-300">{card.title} — </span>}
                {card.content}
              </span>
              <button
                onClick={e => { e.stopPropagation(); deleteCard(card.id) }}
                className="text-red-400 shrink-0 hover:text-red-300"
              >
                ✕
              </button>
            </li>
          ))}
          {chanceCards.length === 0 && (
            <li className="text-gray-500 text-sm italic">No cards yet</li>
          )}
        </ul>
      </div>

      {/* Confirmation modal for random draw */}
      {pendingCard && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setPendingCard(null)}
        >
          <div
            className="max-w-md w-full mx-4 rounded-2xl p-8 text-center border-2 border-indigo-400 bg-gray-800 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-sm uppercase tracking-widest mb-3 text-indigo-400">
              Random Chance Card
            </div>
            {pendingCard.title && (
              <div className="text-xl font-bold text-indigo-300 mb-1">{pendingCard.title}</div>
            )}
            <div className="text-lg text-white mb-6">
              {pendingCard.content}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={rollRandom}
                className="px-4 py-2 rounded text-sm font-semibold bg-gray-600 hover:bg-gray-500 text-white"
              >
                🎲 Re-roll
              </button>
              <button
                onClick={() => setPendingCard(null)}
                className="px-4 py-2 rounded text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => broadcastCard(pendingCard)}
                className="px-4 py-2 rounded text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                ✅ Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
