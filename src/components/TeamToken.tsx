import type { Team } from "../types/database";
import { getTeamColor } from "../utils/teamColors";

interface Props {
  team: Team;
  size?: "sm" | "md" | "lg";
}

export default function TeamToken({ team, size = "md" }: Props) {
  const sizeMap = {
    sm: { outer: "w-8 h-8", emoji: "text-base" },
    md: { outer: "w-11 h-11", emoji: "text-xl" },
    lg: { outer: "w-14 h-14", emoji: "text-2xl" },
  };
  const { outer, emoji } = sizeMap[size];
  const bgColor = getTeamColor(team.turn_order);

  return (
    <span
      className={`${outer} ${emoji} flex items-center justify-center rounded-full border-2 border-white shadow-sm shrink-0`}
      style={{ backgroundColor: bgColor }}
      title={team.name}
    >
      {team.icon}
    </span>
  );
}
