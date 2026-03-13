import { CircleHelp } from "lucide-react";
import type { Tile, Team } from "../types/database";
import type { TileSide } from "../utils/boardGeometry";
import { getTileColors } from "../utils/tileColors";
import TeamToken from "./TeamToken";
import highPunch from "../assets/high-punch.svg";
import guards from "../assets/guards.svg";
import uprising from "../assets/uprising.svg";

const TILE_ICONS: Partial<Record<string, string>> = {
  solo: highPunch,
  head_to_head: guards,
  all_teams: uprising,
};

const CORNER_ICONS: Partial<Record<string, string>> = {
  start: "🚀",
  jail: "🚔",
  pot: "💰",
  pay_taxes: "🏚️",
};

interface Props {
  tile: Tile;
  teams: Team[];
  isCurrent?: boolean;
  side?: TileSide;
  tileSize?: number;
  hoveredTeamId?: string | null;
  style?: React.CSSProperties;
}

const BORDER = "1px solid #1a1a2a";
const BODY_BG = "#FFFFFF";

export default function TileCell({
  tile,
  teams,
  isCurrent,
  side = "bottom",
  tileSize = 80,
  hoveredTeamId,
  style,
}: Props) {
  const colors = getTileColors(tile.tile_type);
  const tileIcon = TILE_ICONS[tile.tile_type];
  const fontSize = Math.max(7, Math.round(tileSize * 0.115));
  const currentOutline = isCurrent
    ? { outline: "2.5px solid #F59E0B", outlineOffset: "-2px", zIndex: 10 }
    : {};

  const indexStyle: React.CSSProperties = {
    position: "absolute",
    top: 2,
    left: 3,
    fontSize: Math.max(6, Math.round(tileSize * 0.09)),
    color: side === "corner" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)",
    lineHeight: 1,
    zIndex: 5,
    pointerEvents: "none",
  };

  // ── Corner tiles ──────────────────────────────────────────────────────────
  if (side === "corner") {
    const icon = CORNER_ICONS[tile.tile_type] ?? "⭐";
    return (
      <div
        style={{
          ...style,
          backgroundColor: colors.stripeColor,
          border: BORDER,
          position: "relative",
          ...currentOutline,
        }}
      >
        <span style={indexStyle}>{tile.position}</span>
        {/* Icon + label — absolutely centered, never displaced by tokens */}
        <div
          style={{
            position: "absolute",
            inset: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <span style={{ fontSize: tileSize * 0.32, lineHeight: 1 }}>{icon}</span>
          <span
            style={{
              fontWeight: 800,
              fontSize: tileSize * 0.13,
              color: "#ffffff",
              textAlign: "center",
              textTransform: "uppercase",
              lineHeight: 1.2,
              letterSpacing: "0.02em",
              padding: "0 4px",
            }}
          >
            {tile.label}
          </span>
        </div>

        {/* Tokens — pinned to bottom */}
        {teams.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 2,
              left: 0,
              right: 0,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 1,
              zIndex: 20,
            }}
          >
            {teams.map((team, i) => {
              const isHovered = hoveredTeamId === team.id;
              return (
                <div
                  key={team.id}
                  style={{
                    marginLeft: i > 0 ? -5 : 0,
                    transform: isHovered ? "scale(1.7) translateY(-4px)" : "scale(1)",
                    filter: isHovered ? "drop-shadow(0 0 6px rgba(255,255,255,0.95))" : "none",
                    transition: "transform 0.2s ease, filter 0.2s ease",
                    zIndex: isHovered ? 30 : "auto",
                    position: "relative",
                  }}
                >
                  <TeamToken team={team} size="sm" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── No-stripe tiles (e.g. Chance, Pay Taxes) ──────────────────────────────
  if (colors.noStripe) {
    const isChance = tile.tile_type === "chance";
    const iconSize = Math.round(tileSize * 0.35);
    return (
      <div
        style={{
          ...style,
          backgroundColor: BODY_BG,
          border: BORDER,
          position: "relative",
          ...currentOutline,
        }}
      >
        <span style={indexStyle}>{tile.position}</span>
        {/* Icon + Label — absolutely centered, never displaced by tokens */}
        <div
          style={{
            position: "absolute",
            inset: "3px 3px 22px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            gap: 2,
          }}
        >
          {isChance && (
            <CircleHelp
              size={iconSize}
              color={colors.stripeColor}
              strokeWidth={2}
            />
          )}
          <span
            style={{
              fontSize,
              fontWeight: 700,
              color: "#1a1a2a",
              textAlign: "center",
              lineHeight: 1.25,
              wordBreak: "break-word",
            }}
          >
            {tile.label}
          </span>
        </div>

        {/* Tokens — pinned to bottom */}
        {teams.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 2,
              left: 0,
              right: 0,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 1,
              zIndex: 20,
            }}
          >
            {teams.map((team, i) => {
              const isHovered = hoveredTeamId === team.id;
              return (
                <div
                  key={team.id}
                  style={{
                    marginLeft: i > 0 ? -4 : 0,
                    transform: isHovered ? "scale(1.7) translateY(-4px)" : "scale(1)",
                    filter: isHovered ? "drop-shadow(0 0 6px rgba(255,255,255,0.95))" : "none",
                    transition: "transform 0.2s ease, filter 0.2s ease",
                    zIndex: isHovered ? 30 : "auto",
                    position: "relative",
                  }}
                >
                  <TeamToken team={team} size="sm" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Stripe dimensions based on which edge faces the center ─────────────────
  const stripeThickness = Math.round(tileSize * 0.28);

  const isHorizontalStripe = side === "bottom" || side === "top";
  const stripeIsFirst = side === "bottom" || side === "right";

  const stripeStyle: React.CSSProperties = isHorizontalStripe
    ? { width: "100%", height: stripeThickness, flexShrink: 0 }
    : { height: "100%", width: stripeThickness, flexShrink: 0 };

  const flexDirection: React.CSSProperties["flexDirection"] = isHorizontalStripe
    ? stripeIsFirst
      ? "column"
      : "column-reverse"
    : stripeIsFirst
      ? "row"
      : "row-reverse";

  return (
    <div
      style={{
        ...style,
        backgroundColor: BODY_BG,
        border: BORDER,
        borderRadius: 0,
        display: "flex",
        flexDirection,
        position: "relative",
        ...currentOutline,
      }}
    >
      <span style={indexStyle}>{tile.position}</span>
      {/* Colored stripe on inner edge */}
      <div
        style={{ ...stripeStyle, backgroundColor: colors.stripeColor }}
      />

      {/* Tile body */}
      <div
        style={{
          flex: 1,
          position: "relative",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {/* Icon + Label — absolutely centered */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            padding: 2,
          }}
        >
          {tileIcon && (
            <img
              src={tileIcon}
              alt=""
              style={{
                width: Math.round(tileSize * 0.4),
                height: Math.round(tileSize * 0.4),
                objectFit: "contain",
              }}
            />
          )}
          <span
            style={{
              fontSize,
              fontWeight: 700,
              color: "#1a1a2a",
              textAlign: "center",
              lineHeight: 1.15,
              wordBreak: "break-word",
            }}
          >
            {tile.label}
          </span>
        </div>

        {/* Tokens — pinned to bottom, overlaid */}
        {teams.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 2,
              left: 0,
              right: 0,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 1,
              zIndex: 20,
            }}
          >
            {teams.map((team, i) => {
              const isHovered = hoveredTeamId === team.id;
              return (
                <div
                  key={team.id}
                  style={{
                    marginLeft: i > 0 ? -4 : 0,
                    transform: isHovered ? "scale(1.7) translateY(-4px)" : "scale(1)",
                    filter: isHovered ? "drop-shadow(0 0 6px rgba(255,255,255,0.95))" : "none",
                    transition: "transform 0.2s ease, filter 0.2s ease",
                    zIndex: isHovered ? 30 : "auto",
                    position: "relative",
                  }}
                >
                  <TeamToken team={team} size="sm" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
