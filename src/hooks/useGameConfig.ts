import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { GameConfig } from '../types/database'

export function useGameConfig() {
  const [config, setConfig] = useState<GameConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('game_config')
      .select('*')
      .single()
      .then(({ data }) => {
        setConfig(data)
        setLoading(false)
      })

    const channel = supabase
      .channel('game_config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_config' },
        (payload) => setConfig(payload.new as GameConfig)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { config, loading }
}
