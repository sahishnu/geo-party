import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Activity } from '../types/database'

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivities = () => {
    return supabase.from('activities').select('*').order('title')
      .then(({ data }) => setActivities(data ?? []))
  }

  useEffect(() => {
    fetchActivities().then(() => setLoading(false))

    const channel = supabase
      .channel('activities_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' },
        () => fetchActivities()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { activities, loading }
}
