import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Card, DeckType } from '../../types/database'

export default function CardDecksTab({ cards }: { cards: Card[] }) {
  const [newContent, setNewContent] = useState<Record<DeckType, string>>({ chance: '', random: '' })
  const [revealedCard, setRevealedCard] = useState<Card | null>(null)

  const chanceCards = cards.filter(c => c.deck_type === 'chance')
  const randomCards = cards.filter(c => c.deck_type === 'random')

  const addCard = async (deck: DeckType) => {
    const content = newContent[deck].trim()
    if (!content) return
    await supabase.from('cards').insert({ deck_type: deck, content })
    setNewContent(prev => ({ ...prev, [deck]: '' }))
  }

  const deleteCard = async (id: string) => {
    await supabase.from('cards').delete().eq('id', id)
  }

  const drawCard = async (deck: DeckType) => {
    const pool = deck === 'chance' ? chanceCards : randomCards
    if (!pool.length) return
    const card = pool[Math.floor(Math.random() * pool.length)]
    setRevealedCard(card)
    await supabase.from('events').insert({
      event_type: 'card_reveal',
      notes: `[${deck.toUpperCase()}] ${card.content}`,
    })
  }

  const DeckSection = ({ deck, deckCards }: { deck: DeckType; deckCards: Card[] }) => (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-600 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg capitalize">{deck} Cards ({deckCards.length})</h3>
        <button onClick={() => drawCard(deck)}
          className={`px-4 py-2 rounded font-semibold text-sm text-white ${
            deck === 'chance' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-teal-600 hover:bg-teal-500'
          }`}>
          Draw {deck === 'chance' ? 'Chance' : 'Random'} Card
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={newContent[deck]}
          onChange={e => setNewContent(prev => ({ ...prev, [deck]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && addCard(deck)}
          placeholder={`Add a ${deck} card...`}
          className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm" />
        <button onClick={() => addCard(deck)}
          className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm">Add</button>
      </div>

      <ul className="space-y-1 max-h-48 overflow-y-auto">
        {deckCards.map(card => (
          <li key={card.id} className="flex gap-2 items-start text-sm bg-gray-700 px-3 py-2 rounded">
            <span className="flex-1">{card.content}</span>
            <button onClick={() => deleteCard(card.id)} className="text-red-400 shrink-0 hover:text-red-300">✕</button>
          </li>
        ))}
        {deckCards.length === 0 && (
          <li className="text-gray-500 text-sm italic">No cards yet</li>
        )}
      </ul>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Card Decks</h2>
      <DeckSection deck="chance" deckCards={chanceCards} />
      <DeckSection deck="random" deckCards={randomCards} />

      {revealedCard && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setRevealedCard(null)}
        >
          <div className={`max-w-lg w-full mx-4 rounded-2xl p-10 text-center border-4 shadow-2xl ${
            revealedCard.deck_type === 'chance'
              ? 'bg-indigo-700 border-indigo-400'
              : 'bg-teal-700 border-teal-400'
          }`}>
            <div className="text-sm uppercase tracking-widest mb-4 opacity-75">
              {revealedCard.deck_type} Card
            </div>
            <div className="text-3xl font-bold leading-snug">{revealedCard.content}</div>
            <div className="mt-8 text-sm opacity-60">Click anywhere to dismiss</div>
          </div>
        </div>
      )}
    </div>
  )
}
