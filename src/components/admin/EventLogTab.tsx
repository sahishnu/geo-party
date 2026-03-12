import type { GameEvent, Team } from '../../types/database'

interface Props {
  events: GameEvent[]
  teams: Team[]
}

const EVENT_ICONS: Record<string, string> = {
  move: '📍',
  score_change: '📊',
  pot_contribution: '💰',
  pot_claim: '🏆',
  card_reveal: '🃏',
}

export default function EventLogTab({ events, teams }: Props) {
  const teamMap = new Map(teams.map(t => [t.id, t]))

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Event Log ({events.length})</h2>
      <ul className="space-y-2">
        {events.map(event => {
          const team = event.team_id ? teamMap.get(event.team_id) : null
          const time = new Date(event.created_at).toLocaleTimeString()
          return (
            <li key={event.id} className="bg-gray-800 rounded-lg px-4 py-3 flex gap-3 items-start">
              <span className="text-xl shrink-0">{EVENT_ICONS[event.event_type] ?? '📝'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 items-baseline flex-wrap">
                  {team && <span className="font-semibold">{team.icon} {team.name}</span>}
                  <span className="text-xs text-gray-400">{time}</span>
                </div>
                <div className="text-sm text-gray-300 mt-0.5">
                  {event.event_type === 'move' && `Moved ${event.spaces_moved} spaces → "${event.tile_label}"`}
                  {event.event_type === 'score_change' && `Score ${(event.points_delta ?? 0) >= 0 ? '+' : ''}${event.points_delta}${event.notes ? ` · ${event.notes}` : ''}`}
                  {event.event_type === 'pot_contribution' && `Paid ${Math.abs(event.points_delta ?? 0)} pts to pot${event.notes ? ` (${event.notes})` : ''}`}
                  {event.event_type === 'pot_claim' && `Claimed pot: +${event.points_delta} pts`}
                  {event.event_type === 'card_reveal' && event.notes}
                </div>
              </div>
            </li>
          )
        })}
        {events.length === 0 && (
          <li className="text-gray-500 italic text-sm">No events yet</li>
        )}
      </ul>
    </div>
  )
}
