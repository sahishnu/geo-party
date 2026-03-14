import type { Team } from "../types/database";
import { getTeamColor, getTeamColorLight } from "../utils/teamColors";
import TeamToken from "./TeamToken";

interface Props {
  team: Team;
  isCurrentTurn: boolean;
  rank?: number;
  onHover?: (id: string | null) => void;
}

export default function PlayerCard({ team, isCurrentTurn, rank, onHover }: Props) {
  const color = getTeamColor(team.turn_order);
  const colorLight = getTeamColorLight(team.turn_order);

  return (
    <div
      className={`relative flex items-center gap-3 rounded-2xl px-5 py-3 min-w-[200px] shadow-md transition-all duration-200 cursor-default border ${
        team.has_hot_potato
          ? 'bg-red-50 border-red-300'
          : 'bg-white border-gray-200'
      }`}
      style={{
        boxShadow: team.has_hot_potato
          ? isCurrentTurn
            ? `0 0 0 2px #dc2626, 0 4px 16px rgba(220,38,38,0.4)`
            : '0 0 12px rgba(220,38,38,0.3)'
          : isCurrentTurn
            ? `0 0 0 2px ${color}, 0 4px 16px ${colorLight}`
            : "0 2px 8px rgba(0,0,0,0.08)",
        transform: isCurrentTurn ? "scale(1.04)" : "scale(1)",
      }}
      onMouseEnter={() => onHover?.(team.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Active turn badge */}
      {isCurrentTurn && (
        <span
          className="absolute -bottom-3 left-5 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm"
          style={{ backgroundColor: color }}
        >
          PLAYING
        </span>
      )}

      {/* Rank badge */}
      {rank !== undefined && (
        <div
          className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold text-white shadow"
          style={{ backgroundColor: rank === 1 ? '#F59E0B' : rank === 2 ? '#9CA3AF' : rank === 3 ? '#B45309' : '#374151' }}
        >
          {rank}
        </div>
      )}

      {/* Avatar */}
      <TeamToken team={team} size="lg" />

      {/* Name + Score + Laps */}
      <div className="min-w-0">
        <div className="font-extrabold text-gray-800 truncate text-md leading-tight">
          {team.name}
        </div>
        <div
          className="font-extrabold text-2xl leading-tight tabular-nums"
          style={{ color }}
        >
          {team.score.toLocaleString()}
          <span className="text-xs font-semibold text-gray-400 ml-1">pts</span>
        </div>
        {team.laps > 0 && (
          <div className="text-xs text-blue-500 font-semibold leading-tight">
            🔁 {team.laps} {team.laps === 1 ? 'lap' : 'laps'}
          </div>
        )}
      </div>

      {/* x2 multiplier badge */}
      {team.has_multiplier && (
        <span className="absolute -top-3 -right-3 bg-fuchsia-600 text-white text-sm font-extrabold px-2 py-0.5 rounded-full shadow-lg ring-2 ring-fuchsia-300">
          x2
        </span>
      )}

      {/* Hot Potato badge */}
      {team.has_hot_potato && (
        <span className="absolute -bottom-3 -right-2 bg-red-600 text-white text-sm font-extrabold px-2 py-0.5 rounded-full shadow-lg ring-2 ring-red-300">
          🥔
        </span>
      )}
    </div>
  );
}
