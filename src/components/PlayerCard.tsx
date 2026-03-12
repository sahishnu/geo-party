import type { Team } from "../types/database";
import { getTeamColor, getTeamColorLight } from "../utils/teamColors";
import TeamToken from "./TeamToken";

interface Props {
  team: Team;
  isCurrentTurn: boolean;
}

export default function PlayerCard({ team, isCurrentTurn }: Props) {
  const color = getTeamColor(team.turn_order);
  const colorLight = getTeamColorLight(team.turn_order);

  return (
    <div
      className="relative flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-md transition-transform duration-300"
      style={{
        border: `1px solid ${color}`,
        boxShadow: isCurrentTurn
          ? `0 0 0 2px ${color}, 0 4px 16px ${colorLight}`
          : "0 2px 8px rgba(0,0,0,0.08)",
        transform: isCurrentTurn ? "scale(1.04)" : "scale(1)",
      }}
    >
      {/* Active turn badge */}
      {isCurrentTurn && (
        <span
          className="absolute -top-2.5 left-4 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm animate-bounce"
          style={{ backgroundColor: color }}
        >
          PLAYING
        </span>
      )}

      {/* Avatar */}
      <TeamToken team={team} size="lg" />

      {/* Name + Score */}
      <div className="min-w-0">
        <div className="font-bold text-gray-800 truncate text-sm leading-tight">
          {team.name}
        </div>
        <div
          className="font-extrabold text-2xl leading-tight tabular-nums"
          style={{ color }}
        >
          {team.score.toLocaleString()}
          <span className="text-xs font-semibold text-gray-400 ml-1">pts</span>
        </div>
      </div>
    </div>
  );
}
