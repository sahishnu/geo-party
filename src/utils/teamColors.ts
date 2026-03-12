const TEAM_COLORS = [
  "#FF6B6B", // 1 — Coral
  "#4ECDC4", // 2 — Teal
  "#95E06C", // 3 — Lime
  "#A78BFA", // 4 — Violet
  "#FFB347", // 5 — Tangerine
  "#67E8C5", // 6 — Mint
];

/**
 * Returns the identity color for a team based on its turn_order (1-indexed).
 * Falls back to a neutral gray for teams beyond slot 6.
 */
export function getTeamColor(turnOrder: number): string {
  return TEAM_COLORS[(turnOrder - 1) % TEAM_COLORS.length] ?? "#9CA3AF";
}

/**
 * Returns a lighter tint (20% opacity) of the team color for backgrounds.
 * Uses inline opacity via hex alpha.
 */
export function getTeamColorLight(turnOrder: number): string {
  const color = getTeamColor(turnOrder);
  return `${color}33`; // 33 = ~20% opacity in hex
}
