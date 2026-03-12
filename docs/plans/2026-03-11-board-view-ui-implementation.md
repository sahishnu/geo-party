# Board View UI Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Geo Party board view from a dark flat UI into a light, fun "Confetti Carnival" design with player avatar cards, a styled game log feed, and vibrant team identity colors.

**Architecture:** Add a `teamColors.ts` utility that maps `turn_order` (1–6) to a vibrant hex color. Create two new presentational components (`PlayerCard`, `EventLogFeed`). Restructure `BoardView.tsx` layout to match the reference: horizontal player card strip at top, board center-left, game log feed right. Update `TeamToken.tsx` and `TileCell.tsx` for the light theme. Load Nunito font from Google Fonts in `index.html`.

**Tech Stack:** React + TypeScript + Tailwind CSS (Vite project). No new npm packages required.

**Design reference:** `docs/plans/2026-03-11-board-view-ui-design.md`

---

### Task 1: Add Nunito Font & Global Body Styles

**Files:**

- Modify: `index.html`
- Modify: `src/index.css` (or wherever global styles live — check for this file; if absent, add styles to `src/main.tsx` via a `<style>` tag injection or create `src/index.css` and import it)

**Step 1: Add Nunito to index.html**

Open `index.html` and add the Google Fonts link inside `<head>`, just before the closing `</head>` tag:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap"
  rel="stylesheet"
/>
```

**Step 2: Apply Nunito globally**

Check if `src/index.css` exists. If it does, add to it. If not, check if there's any existing CSS file imported by `src/main.tsx`. Add:

```css
body {
  font-family: "Nunito", sans-serif;
  background-color: #fafaf8;
}
```

**Step 3: Verify**

Run `npm run dev` and open the app. Open browser DevTools → Elements. The `body` should show `font-family: Nunito`. No visual regression on the admin panel is expected.

---

### Task 2: Create `teamColors.ts` Utility

**Files:**

- Create: `src/utils/teamColors.ts`

**Step 1: Write the utility**

Create `src/utils/teamColors.ts`:

```typescript
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
```

**Step 2: Verify types**

Run `npm run build` (or `npx tsc --noEmit`). Should compile without errors.

---

### Task 3: Update `TeamToken` Component

**Files:**

- Modify: `src/components/TeamToken.tsx`

**Current code for reference:**

```tsx
import type { Team } from "../types/database";

interface Props {
  team: Team;
  size?: "sm" | "md";
}

export default function TeamToken({ team, size = "md" }: Props) {
  const sizeClass = size === "sm" ? "text-lg w-7 h-7" : "text-2xl w-9 h-9";
  return (
    <span
      className={`${sizeClass} flex items-center justify-center rounded-full bg-black/40 border-2 border-white/30`}
      title={team.name}
    >
      {team.icon}
    </span>
  );
}
```

**Step 1: Rewrite TeamToken**

Replace the entire file contents with:

```tsx
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
```

**Step 2: Visual check**

With dev server running, navigate to the board view. Tokens on tiles should now have vibrant colored backgrounds with white borders instead of the dark transparent ones. Multiple tokens on the same tile should still stack/wrap correctly.

---

### Task 4: Create `PlayerCard` Component

**Files:**

- Create: `src/components/PlayerCard.tsx`

**Step 1: Create the component**

```tsx
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
        borderLeft: `4px solid ${color}`,
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
```

**Step 2: Visual check**

This component isn't rendered anywhere yet — that happens in Task 6. No verification needed here until integrated.

---

### Task 5: Create `EventLogFeed` Component

**Files:**

- Create: `src/components/EventLogFeed.tsx`

**Step 1: Create the component**

```tsx
import type { GameEvent, Team } from "../types/database";
import { getTeamColor } from "../utils/teamColors";

interface Props {
  events: GameEvent[];
  teamMap: Map<string, Team>;
}

function formatEvent(event: GameEvent, teamName?: string): string {
  const name = teamName ?? "Unknown";
  switch (event.event_type) {
    case "move":
      return `moved ${event.spaces_moved} spaces to "${event.tile_label}"`;
    case "score_change":
      return `${(event.points_delta ?? 0) >= 0 ? "+" : ""}${
        event.points_delta
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
                  {formatEvent(event, team?.name)}
                </span>
                <div className="text-xs text-gray-400 mt-0.5">{timeAgo(event.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Add the `fadeInDown` keyframe animation**

In your global CSS file (same one edited in Task 1), add:

```css
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeInDown {
  animation: fadeInDown 0.3s ease-out both;
}
```

Note: Tailwind doesn't have `fadeInDown` built in, so we add it as a custom CSS class.

---

### Task 6: Restructure `BoardView.tsx`

**Files:**

- Modify: `src/pages/BoardView.tsx`

This is the main layout restructure. Replace the entire file with the new layout:

```tsx
import { useEffect, useState } from "react";
import Board from "../components/Board";
import PlayerCard from "../components/PlayerCard";
import EventLogFeed from "../components/EventLogFeed";
import { useGameConfig } from "../hooks/useGameConfig";
import { useTeams } from "../hooks/useTeams";
import { useTiles } from "../hooks/useTiles";
import { useEvents } from "../hooks/useEvents";
import { supabase } from "../lib/supabase";
import type { Team } from "../types/database";

export default function BoardView() {
  const { config, loading: configLoading } = useGameConfig();
  const { teams } = useTeams();
  const { tiles } = useTiles();
  const { events } = useEvents(10);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const channel = supabase.channel("connection_check").subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (configLoading || !config) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#FAFAF8" }}
      >
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🎲</div>
          <p className="text-gray-500 font-semibold">Loading game...</p>
        </div>
      </div>
    );
  }

  const sortedTeams = [...teams].sort((a, b) => a.turn_order - b.turn_order);
  const teamMap = new Map<string, Team>(teams.map((t) => [t.id, t]));

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: "#FAFAF8",
        backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      {/* Reconnecting banner */}
      {!connected && (
        <div className="bg-amber-400 text-amber-900 text-xs text-center py-1 px-4 font-semibold shrink-0">
          Reconnecting to server...
        </div>
      )}

      {/* ── Player Card Strip ── */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 flex-wrap shrink-0">
        {sortedTeams.map((team) => (
          <PlayerCard
            key={team.id}
            team={team}
            isCurrentTurn={team.id === config.current_team_id}
          />
        ))}

        {/* Pot pill — pushes to the right */}
        <div className="ml-auto shrink-0">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-white shadow-md text-sm"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              boxShadow:
                config.pot_total > 0
                  ? "0 0 12px rgba(245, 158, 11, 0.5), 0 2px 8px rgba(0,0,0,0.1)"
                  : "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <span className="text-lg">🪙</span>
            <div>
              <div className="text-xs opacity-80 leading-none">POT</div>
              <div className="text-lg font-extrabold leading-tight tabular-nums">
                {config.pot_total.toLocaleString()}
                <span className="text-xs font-semibold opacity-80 ml-1">
                  pts
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Board + Event Log ── */}
      <div className="flex flex-1 gap-4 px-5 pb-4 overflow-hidden min-h-0">
        {/* Board area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {tiles.length > 0 ? (
            <Board tiles={tiles} teams={teams} config={config} />
          ) : (
            <div className="text-center text-gray-400">
              <p className="text-5xl mb-4">🗺️</p>
              <p className="text-lg font-bold text-gray-500">No board yet</p>
              <p className="text-sm mt-1">
                Go to Admin → Board tab to set up the board.
              </p>
            </div>
          )}
        </div>

        {/* Event Log feed */}
        <div className="w-72 shrink-0 bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-4 shadow-sm overflow-hidden flex flex-col">
          <EventLogFeed events={events} teamMap={teamMap} />
        </div>
      </div>
    </div>
  );
}
```

**Step 1: Replace the file as above.**

**Step 2: Verify layout**

Run `npm run dev`. Open `/`. Confirm:

- Background is warm white with dot grid
- Player cards show at top with correct team colors, PLAYING badge on active team
- Gold pot pill on the right of the card strip
- Board renders in main area
- Event log feed panel on the right
- No TypeScript errors in the terminal

**Step 3: Check TypeScript**

Run `npx tsc --noEmit`. Should be error-free.

---

### Task 7: Update `TileCell` for Light Theme Board

**Files:**

- Modify: `src/components/TileCell.tsx`

The tile type colors remain the same (they convey game information), but we update the surrounding chrome to match the lighter board aesthetic.

**Step 1: Update TileCell**

```tsx
import type { Tile, Team } from "../types/database";
import { getTileColors } from "../utils/tileColors";
import TeamToken from "./TeamToken";

interface Props {
  tile: Tile;
  teams: Team[];
  isCurrent?: boolean;
  style?: React.CSSProperties;
}

export default function TileCell({ tile, teams, isCurrent, style }: Props) {
  const colors = getTileColors(tile.tile_type);

  return (
    <div
      className={`
        ${colors.bg} ${colors.text}
        border rounded-md flex flex-col items-center justify-between
        p-1 overflow-hidden relative
        ${isCurrent ? "ring-2 ring-offset-1 ring-white shadow-lg" : ""}
      `}
      style={{
        ...style,
        borderColor: "rgba(255,255,255,0.3)",
      }}
    >
      {tile.image_url && (
        <img
          src={tile.image_url}
          alt={tile.label}
          className="w-full h-10 object-cover rounded mb-1"
        />
      )}
      <span className="text-center text-xs font-bold leading-tight line-clamp-2 flex-1">
        {tile.label}
      </span>
      {teams.length > 0 && (
        <div
          className="flex flex-wrap gap-0.5 justify-center mt-1"
          style={{ marginLeft: "-2px" }}
        >
          {teams.map((team, i) => (
            <div key={team.id} style={{ marginLeft: i > 0 ? "-6px" : 0 }}>
              <TeamToken team={team} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify**

Check the board view. Tiles should look the same color-wise but tokens now overlap slightly in a cluster rather than wrapping.

---

### Task 8: Final Polish & TypeScript Check

**Files:**

- Review all modified/created files

**Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 2: Run existing tests**

```bash
npm test
```

Expected: all existing tests pass (no test files were modified).

**Step 3: Visual acceptance check**

With `npm run dev` running, open the board view and verify against the reference image:

- [ ] Warm white dot-grid background
- [ ] Player cards at top with team-colored left border, large emoji avatar, bold score, correct PLAYING badge on active team
- [ ] Gold pot pill on far right of card strip
- [ ] Board renders correctly with colored tiles
- [ ] Team tokens on tiles have vibrant colored circle backgrounds with white border
- [ ] Event log panel on the right with colored avatar pips and fading older events
- [ ] Loading spinner uses dice emoji instead of blank gray screen
- [ ] Reconnecting banner is amber/gold instead of yellow
- [ ] No console errors

---

## File Summary

| File                              | Action | Notes                                                         |
| --------------------------------- | ------ | ------------------------------------------------------------- |
| `index.html`                      | Modify | Add Nunito Google Fonts link                                  |
| `src/index.css` (or global CSS)   | Modify | Add `font-family: Nunito`, dot-grid bg, `fadeInDown` keyframe |
| `src/utils/teamColors.ts`         | Create | 6-slot team color lookup                                      |
| `src/components/TeamToken.tsx`    | Modify | Use team identity color                                       |
| `src/components/PlayerCard.tsx`   | Create | Avatar card for scoreboard strip                              |
| `src/components/EventLogFeed.tsx` | Create | Styled game log feed                                          |
| `src/pages/BoardView.tsx`         | Modify | Full layout restructure                                       |
| `src/components/TileCell.tsx`     | Modify | Light-theme tile chrome + token clustering                    |
