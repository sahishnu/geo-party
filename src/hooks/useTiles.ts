import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Tile } from '../types/database'

export function useTiles() {
  const [tiles, setTiles] = useState<Tile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('tiles')
      .select('*')
      .order('position')
      .then(({ data }) => {
        setTiles(data ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel('tiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tiles' },
        () => {
          supabase
            .from('tiles')
            .select('*')
            .order('position')
            .then(({ data }) => setTiles(data ?? []))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { tiles, loading }
}
