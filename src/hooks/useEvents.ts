import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { GameEvent } from '../types/database'

export function useEvents(limit = 50) {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = () =>
    supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => setEvents(data ?? []))

  useEffect(() => {
    fetchEvents().then(() => setLoading(false))

    const channel = supabase
      .channel('events_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' },
        () => fetchEvents()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [limit])

  return { events, loading }
}
