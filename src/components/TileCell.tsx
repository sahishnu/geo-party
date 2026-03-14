import { CircleHelp } from "lucide-react";
import type { Tile, Team } from "../types/database";
import type { TileSide } from "../utils/boardGeometry";
import { getTileColors } from "../utils/tileColors";
import TeamToken from "./TeamToken";
import prisoner from "../assets/prisoner.svg";
import policeOfficerHead from "../assets/police-officer-head.svg";
import payMoney from "../assets/pay-money.svg";
import cash from "../assets/cash.svg";

function DotPattern({ type, size, color = "#1a1a2a" }: { type: string; size: number; color?: string }) {
  const dotR = Math.max(2, size * 0.07);
  const cx = size / 2;
  const cy = size / 2;

  if (type === "solo") {
    return (
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={dotR} fill={color} />
      </svg>
    );
  }

  if (type === "head_to_head") {
    const gap = dotR * 2.5;
    return (
      <svg width={size} height={size}>
        <circle cx={cx - gap} cy={cy} r={dotR} fill={color} />
        <circle cx={cx + gap} cy={cy} r={dotR} fill={color} />
      </svg>
    );
  }

  if (type === "all_teams") {
    const r = size * 0.22;
    return (
      <svg width={size} height={size}>
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          return (
            <circle
              key={i}
              cx={cx + r * Math.cos(angle)}
              cy={cy + r * Math.sin(angle)}
              r={dotR}
              fill={color}
            />
          );
        })}
      </svg>
    );
  }

  if (type === "rainbow") {
    const r = size * 0.28;
    const dotColors = ["#DC2626", "#2563EB", "#16A34A", "#DC2626", "#2563EB", "#16A34A"];
    return (
      <svg width={size} height={size}>
        {dotColors.map((c, i) => {
          const angle = (Math.PI * 2 * i) / dotColors.length - Math.PI / 2;
          return (
            <circle
              key={i}
              cx={cx + r * Math.cos(angle)}
              cy={cy + r * Math.sin(angle)}
              r={dotR}
              fill={c}
            />
          );
        })}
      </svg>
    );
  }

  return null;
}

const CORNER_ICONS: Partial<Record<string, string>> = {
  start: "🚀",
  jail: "🚔",
  pot: "💰",
  pay_taxes: "🏚️",
};

const CORNER_SVGS: Partial<Record<string, string>> = {
  jail: prisoner,
  go_to_jail: policeOfficerHead,
  pay_taxes: payMoney,
  pot: cash,
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

// Short Gujarat town/village/city names for tile stripe decoration
const GUJARAT_NAMES = [
  "Surat", "Borivali", "Rajkot", "Bhuj", "Andheri",
  "Vapi", "Dadar", "Morbi", "Diu", "Bandra",
  "Godhra", "Dahod", "Veraval", "Dwarka", "Mandvi",
  "Worli", "Mahuva", "Colaba", "Jetpur", "Gondal",
  "Juhu", "Una", "Modasa", "Malad", "Visnagar",
  "Parel", "Sanand", "Valsad", "Kurla", "Bardoli",
  "Thane", "Karjan",
];

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
  const hasDots = tile.tile_type === "solo" || tile.tile_type === "head_to_head" || tile.tile_type === "all_teams" || tile.tile_type === "rainbow";
  const fontSize = Math.max(7, Math.round(tileSize * 0.16));
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
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          {CORNER_SVGS[tile.tile_type] ? (
            <img
              src={CORNER_SVGS[tile.tile_type]}
              alt={tile.label}
              style={{ width: tileSize * 0.7, height: tileSize * 0.7, filter: "invert(1)" }}
            />
          ) : (
            <>
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
            </>
          )}
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
    const isTaxes = tile.tile_type === "pay_taxes";
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
            inset: isTaxes ? "0" : "3px 3px 22px",
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
          {isTaxes ? (
            <img
              src={payMoney}
              alt="Pay Taxes"
              style={{ width: tileSize * 0.7, height: tileSize * 0.7 }}
            />
          ) : (
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
          )}
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

  const gujaratName = GUJARAT_NAMES[tile.position % GUJARAT_NAMES.length];
  const stripeFontSize = Math.max(5, Math.round(stripeThickness * 0.34));
  const isVerticalText = side === "left" || side === "right";

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
        style={{
          ...stripeStyle,
          ...(colors.stripeColor === "rainbow"
            ? { background: isHorizontalStripe
                ? "linear-gradient(to right, #DC2626, #2563EB, #16A34A)"
                : "linear-gradient(to bottom, #DC2626, #2563EB, #16A34A)" }
            : { backgroundColor: colors.stripeColor }),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontSize: stripeFontSize,
            fontWeight: 700,
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            lineHeight: 1,
            whiteSpace: "nowrap",
            userSelect: "none",
            ...(isVerticalText
              ? { writingMode: "vertical-rl", textOrientation: "mixed" }
              : {}),
          }}
        >
          {gujaratName}
        </span>
      </div>

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
          {hasDots && (
            <DotPattern type={tile.tile_type} size={Math.round(tileSize * 0.4)} color={colors.stripeColor} />
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
