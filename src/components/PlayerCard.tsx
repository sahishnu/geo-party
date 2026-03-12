import type { Team } from "../types/database";
import { getTeamColor, getTeamColorLight } from "../utils/teamColors";
import TeamToken from "./TeamToken";

interface Props {
  team: Team;
  isCurrentTurn: boolean;
  rank?: number;
}

export default function PlayerCard({ team, isCurrentTurn, rank }: Props) {
  const color = getTeamColor(team.turn_order);
  const colorLight = getTeamColorLight(team.turn_order);

  return (
    <div
      className="border border-gray-200 relative flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-md transition-transform duration-300"
      style={{
        boxShadow: isCurrentTurn
          ? `0 0 0 2px ${color}, 0 4px 16px ${colorLight}`
          : "0 2px 8px rgba(0,0,0,0.08)",
        transform: isCurrentTurn ? "scale(1.04)" : "scale(1)",
      }}
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
    </div>
  );
}
