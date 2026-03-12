import type { GameEvent, Team } from "../types/database";
import { getTeamColor } from "../utils/teamColors";

interface Props {
  events: GameEvent[];
  teamMap: Map<string, Team>;
}

function formatEvent(event: GameEvent, _teamName?: string): string {
  switch (event.event_type) {
    case "move":
      return `moved ${event.spaces_moved} spaces to "${event.tile_label}"`;
    case "score_change":
      return `${(event.points_delta ?? 0) >= 0 ? "+" : ""}${event.points_delta
        } pts${event.notes ? ` (${event.notes})` : ""}`;
    case "pot_claim":
      return `claimed the pot! 🎉`;
    case "pot_contribution":
      return `added ${Math.abs(event.points_delta ?? 0)} pts to pot`;
    case "card_reveal":
      return `card: ${event.notes}`;
    default:
      return event.notes ?? "";
  }
}

function timeAgo(isoString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(isoString).getTime()) / 1000
  );
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function EventLogFeed({ events, teamMap }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-gray-400 text-base">🕑</span>
        <h2 className="font-bold text-gray-700 text-base">Game Log</h2>
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
        {events.length === 0 && (
          <p className="text-gray-400 text-sm italic px-1">No events yet</p>
        )}
        {events.map((event, index) => {
          const team = event.team_id ? teamMap.get(event.team_id) : undefined;
          const color = team ? getTeamColor(team.turn_order) : "#9CA3AF";
          const opacity = Math.max(0.35, 1 - index * 0.08);

          return (
            <div
              key={event.id}
              className="flex items-start gap-2.5 animate-fadeInDown"
              style={{ opacity }}
            >
              {/* Avatar pip */}
              <span
                className="w-7 h-7 flex items-center justify-center rounded-full text-sm shrink-0 border-2 border-white shadow-sm mt-0.5"
                style={{ backgroundColor: color }}
              >
                {team?.icon ?? "🎲"}
              </span>
              {/* Text */}
              <div className="min-w-0">
                <span className="font-bold text-gray-800 text-sm">
                  {team?.name ?? "Unknown"}
                </span>{" "}
                <span className="text-gray-600 text-sm">
                  {formatEvent(event)}
                </span>
                <div className="text-xs text-gray-400 mt-0.5">
                  {timeAgo(event.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
