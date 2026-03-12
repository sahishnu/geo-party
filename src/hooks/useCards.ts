import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Card, DeckType } from '../types/database'

export function useCards(deckType?: DeckType) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCards = () => {
    let query = supabase.from('cards').select('*').order('created_at')
    if (deckType) query = query.eq('deck_type', deckType)
    return query.then(({ data }) => setCards(data ?? []))
  }

  useEffect(() => {
    fetchCards().then(() => setLoading(false))

    const channel = supabase
      .channel('cards_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' },
        () => fetchCards()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [deckType])

  return { cards, loading }
}
