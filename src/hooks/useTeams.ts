import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Team } from '../types/database'

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('teams')
      .select('*')
      .order('turn_order')
      .then(({ data }) => {
        setTeams(data ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel('teams_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' },
        () => {
          supabase
            .from('teams')
            .select('*')
            .order('turn_order')
            .then(({ data }) => setTeams(data ?? []))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { teams, loading }
}
