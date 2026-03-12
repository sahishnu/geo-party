import type { Team } from "../types/database";
import { getTeamColor } from "../utils/teamColors";

interface Props {
  team: Team;
  size?: "sm" | "md" | "lg";
}

export default function TeamToken({ team, size = "md" }: Props) {
  const sizeMap = {
    sm: { outer: "w-9 h-9", emoji: "text-base" },
    md: { outer: "w-11 h-11", emoji: "text-xl" },
    lg: { outer: "w-14 h-14", emoji: "text-2xl" },
  };
  const { outer, emoji } = sizeMap[size];
  const bgColor = getTeamColor(team.turn_order);

  return (
    <span
      className={`${outer} ${emoji} flex items-center justify-center rounded-full shrink-0`}
      style={{
        backgroundColor: bgColor,
        border: "2.5px solid rgba(255,255,255,0.9)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.15)",
      }}
      title={team.name}
    >
      {team.icon}
    </span>
  );
}
