import { useEffect, useState } from 'react'
import Board from '../components/Board'
import { useGameConfig } from '../hooks/useGameConfig'
import { useTeams } from '../hooks/useTeams'
import { useTiles } from '../hooks/useTiles'
import { useEvents } from '../hooks/useEvents'
import { supabase } from '../lib/supabase'
import type { GameEvent, Team } from '../types/database'

function formatEvent(event: GameEvent, teamName?: string): string {
  const name = teamName ?? 'Unknown'
  switch (event.event_type) {
    case 'move':
      return `${name} moved ${event.spaces_moved} spaces to "${event.tile_label}"`
    case 'score_change':
      return `${name} ${(event.points_delta ?? 0) >= 0 ? '+' : ''}${event.points_delta} pts${event.notes ? ` (${event.notes})` : ''}`
    case 'pot_claim':
      return `${name} claimed the pot!`
    case 'pot_contribution':
      return `${name} contributed ${Math.abs(event.points_delta ?? 0)} pts to pot`
    case 'card_reveal':
      return `Card revealed: ${event.notes}`
    default:
      return event.notes ?? ''
  }
}

export default function BoardView() {
  const { config, loading: configLoading } = useGameConfig()
  const { teams } = useTeams()
  const { tiles } = useTiles()
  const { events } = useEvents(10)
  const [connected, setConnected] = useState(true)

  useEffect(() => {
    const channel = supabase
      .channel('connection_check')
      .subscribe(status => {
        setConnected(status === 'SUBSCRIBED')
      })
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (configLoading || !config) {
    return (
      <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const sortedTeams = [...teams].sort((a, b) => a.turn_order - b.turn_order)
  const teamMap = new Map<string, Team>(teams.map(t => [t.id, t]))

  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col overflow-hidden">
      {!connected && (
        <div className="bg-yellow-600 text-black text-xs text-center py-1 px-4 shrink-0">
          Reconnecting to server...
        </div>
      )}

      {/* Top 25%: Scoreboard + Event Log */}
      <div className="h-[25vh] border-b border-gray-700 flex shrink-0">
        {/* Scoreboard */}
        <div className="flex-1 p-3 border-r border-gray-700 overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Scoreboard</h2>
            <span className="ml-auto text-xs text-purple-400 font-semibold">
              Pot: {config.pot_total} pts
            </span>
          </div>
          <div className="flex gap-3 flex-wrap overflow-hidden">
            {sortedTeams.map(team => (
              <div
                key={team.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border ${
                  team.id === config.current_team_id ? 'border-yellow-400' : 'border-gray-600'
                }`}
              >
                <span className="text-xl">{team.icon}</span>
                <div>
                  <div className="text-xs text-gray-400">{team.name}</div>
                  <div className="text-lg font-bold">{team.score}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Log */}
        <div className="w-80 p-3 overflow-y-auto shrink-0">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Recent Events</h2>
          <ul className="space-y-1">
            {events.map(event => {
              const team = event.team_id ? teamMap.get(event.team_id) : undefined
              return (
                <li key={event.id} className="text-xs text-gray-300 flex gap-2">
                  <span className="shrink-0">{team?.icon ?? '🎲'}</span>
                  <span>{formatEvent(event, team?.name)}</span>
                </li>
              )
            })}
            {events.length === 0 && (
              <li className="text-gray-600 italic text-xs">No events yet</li>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom 75%: Board */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {tiles.length > 0 ? (
          <Board tiles={tiles} teams={teams} config={config} />
        ) : (
          <div className="text-gray-600 text-center">
            <p className="text-lg">No tiles yet.</p>
            <p className="text-sm mt-1">Go to Admin → Board tab to set up the board.</p>
          </div>
        )}
      </div>
    </div>
  )
}
