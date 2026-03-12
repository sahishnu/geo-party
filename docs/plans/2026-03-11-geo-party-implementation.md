# Geo Party Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a digital Monopoly-style board game display for in-person group events, with a real-time board view (projector/TV) and an admin control panel.

**Architecture:** A single React (Vite + TypeScript) app with two routes — `/` for the board view and `/admin` for the host control panel. Supabase provides the PostgreSQL database and real-time subscriptions so the board view updates instantly when the admin takes any action. All game state lives in Supabase; the React app is purely display and control.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS v3, React Router v6, Supabase JS client v2, Vitest + React Testing Library (for utility/hook tests)

---

## Prerequisites

Before starting, you need a free Supabase project:

1. Go to https://supabase.com and create a free account
2. Create a new project (any region, remember the database password)
3. From Project Settings → API, copy:
   - **Project URL** (e.g., `https://xyz.supabase.co`)
   - **anon/public key**
4. Keep these ready for Task 2

---

## Task 1: Project Scaffold

**Files:**

- Create: `package.json` (via npm)
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `.env.local`
- Create: `.gitignore`

**Step 1: Scaffold the Vite + React + TypeScript project**

Run in `/Users/sahishnu.patel/geo-party`:

```bash
npm create vite@latest . -- --template react-ts
npm install
```

When prompted about files existing, choose to ignore/overwrite as appropriate. The `.` installs into the current directory.

**Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install -D tailwindcss postcss autoprefixer vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
npx tailwindcss init -p
```

**Step 3: Configure Tailwind**

Replace contents of `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

Replace contents of `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Configure Vitest**

Add to `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
});
```

Create `src/test-setup.ts`:

```ts
import "@testing-library/jest-dom";
```

**Step 5: Create `.env.local`**

```
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Step 6: Update `.gitignore`**

Ensure `.env.local` is listed (Vite's default `.gitignore` includes it, verify).

**Step 7: Replace `src/App.tsx` with a placeholder**

```tsx
export default function App() {
  return (
    <div className="text-white bg-gray-900 min-h-screen p-4">Geo Party</div>
  );
}
```

**Step 8: Run dev server to verify scaffold works**

```bash
npm run dev
```

Expected: browser opens at `http://localhost:5173` showing "Geo Party" in white text on dark background.

**Step 9: Commit**

```bash
git add -A && git commit -m "feat: scaffold Vite + React + TypeScript + Tailwind project"
```

---

## Task 2: Supabase Schema

**Files:**

- Create: `supabase/schema.sql` (reference only — run in Supabase dashboard)

**Step 1: Create the schema file**

Create `supabase/schema.sql` with the following SQL. You will run this in the Supabase SQL editor (Dashboard → SQL Editor → New query):

```sql
-- Enums
create type tile_type as enum (
  'solo', 'head_to_head', 'all_teams', 'misc',
  'start', 'jail', 'pot', 'pay_taxes', 'chance', 'random'
);

create type event_type as enum (
  'move', 'score_change', 'pot_contribution', 'pot_claim', 'card_reveal'
);

create type deck_type as enum ('chance', 'random');

-- game_config: single row, always id = 'singleton'
create table game_config (
  id uuid primary key default gen_random_uuid(),
  game_name text not null default 'Geo Party',
  tiles_per_side integer not null default 9,
  jail_penalty integer not null default 50,
  tax_penalty integer not null default 30,
  pot_total integer not null default 0,
  current_team_id uuid references teams(id) on delete set null
);

-- teams
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '🎮',
  score integer not null default 0,
  position integer not null default 0,
  turn_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- tiles
create table tiles (
  id uuid primary key default gen_random_uuid(),
  position integer not null unique,
  label text not null default 'Unnamed Tile',
  image_url text,
  tile_type tile_type not null default 'misc',
  color_group text not null default 'yellow'
);

-- events (append-only log)
create table events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type event_type not null,
  team_id uuid references teams(id) on delete set null,
  spaces_moved integer,
  from_position integer,
  to_position integer,
  tile_label text,
  points_delta integer,
  notes text
);

-- cards (Chance and Random decks)
create table cards (
  id uuid primary key default gen_random_uuid(),
  deck_type deck_type not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Insert a single game_config row
insert into game_config (game_name) values ('Geo Party');

-- Enable real-time for all tables
alter publication supabase_realtime add table game_config;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table tiles;
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table cards;
```

**Note:** The `game_config` table references `teams` in `current_team_id`. Because of this circular reference, run the schema in this order:

1. Create the `teams` table first (before `game_config`)
2. Then create `game_config` with the FK to `teams`

In the SQL editor, paste the whole script — PostgreSQL will handle the order correctly since `current_team_id` is nullable.

**Step 2: Run in Supabase SQL editor**

Go to your Supabase project dashboard → SQL Editor → New query. Paste the entire SQL and click Run.

Expected: All tables created with no errors.

**Step 3: Disable Row Level Security for now**

In Supabase Dashboard → Table Editor, for each table, disable RLS (since there's no authentication in this app — it's a trusted admin-only tool).

Or run in SQL editor:

```sql
alter table game_config disable row level security;
alter table teams disable row level security;
alter table tiles disable row level security;
alter table events disable row level security;
alter table cards disable row level security;
```

**Step 4: Commit the schema file**

```bash
git add supabase/schema.sql && git commit -m "feat: add Supabase schema SQL"
```

---

## Task 3: Supabase Client and TypeScript Types

**Files:**

- Create: `src/lib/supabase.ts`
- Create: `src/types/database.ts`

**Step 1: Write TypeScript database types**

Create `src/types/database.ts`:

```ts
export type TileType =
  | "solo"
  | "head_to_head"
  | "all_teams"
  | "misc"
  | "start"
  | "jail"
  | "pot"
  | "pay_taxes"
  | "chance"
  | "random";

export type EventType =
  | "move"
  | "score_change"
  | "pot_contribution"
  | "pot_claim"
  | "card_reveal";

export type DeckType = "chance" | "random";

export interface GameConfig {
  id: string;
  game_name: string;
  tiles_per_side: number;
  jail_penalty: number;
  tax_penalty: number;
  pot_total: number;
  current_team_id: string | null;
}

export interface Team {
  id: string;
  name: string;
  icon: string;
  score: number;
  position: number;
  turn_order: number;
  created_at: string;
}

export interface Tile {
  id: string;
  position: number;
  label: string;
  image_url: string | null;
  tile_type: TileType;
  color_group: string;
}

export interface GameEvent {
  id: string;
  created_at: string;
  event_type: EventType;
  team_id: string | null;
  spaces_moved: number | null;
  from_position: number | null;
  to_position: number | null;
  tile_label: string | null;
  points_delta: number | null;
  notes: string | null;
}

export interface Card {
  id: string;
  deck_type: DeckType;
  content: string;
  created_at: string;
}
```

**Step 2: Write the Supabase client singleton**

Create `src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Step 3: Write a test to verify types compile**

Create `src/types/database.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Team, Tile, GameConfig, GameEvent, Card } from "./database";

describe("database types", () => {
  it("Team type has required fields", () => {
    const team: Team = {
      id: "1",
      name: "Team A",
      icon: "🎮",
      score: 0,
      position: 0,
      turn_order: 0,
      created_at: "",
    };
    expect(team.name).toBe("Team A");
  });

  it("Tile type has required fields", () => {
    const tile: Tile = {
      id: "1",
      position: 0,
      label: "Start",
      image_url: null,
      tile_type: "start",
      color_group: "gray",
    };
    expect(tile.tile_type).toBe("start");
  });
});
```

**Step 4: Run tests**

```bash
npm run test -- --run
```

Expected: 2 tests pass.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Supabase client and TypeScript database types"
```

---

## Task 4: React Router Setup and Route Skeleton

**Files:**

- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Create: `src/pages/BoardView.tsx`
- Create: `src/pages/AdminPanel.tsx`

**Step 1: Update `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Step 2: Update `src/App.tsx`**

```tsx
import { Routes, Route, Link } from "react-router-dom";
import BoardView from "./pages/BoardView";
import AdminPanel from "./pages/AdminPanel";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BoardView />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}
```

**Step 3: Create `src/pages/BoardView.tsx`**

```tsx
export default function BoardView() {
  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col">
      <div className="h-1/4 border-b border-gray-700 flex">
        <div className="flex-1 p-4 border-r border-gray-700">
          <h2 className="text-lg font-bold">Scoreboard</h2>
        </div>
        <div className="flex-1 p-4">
          <h2 className="text-lg font-bold">Event Log</h2>
        </div>
      </div>
      <div className="flex-1 p-4">
        <h2 className="text-lg font-bold">Board</h2>
      </div>
    </div>
  );
}
```

**Step 4: Create `src/pages/AdminPanel.tsx`**

```tsx
export default function AdminPanel() {
  return (
    <div className="bg-gray-900 min-h-screen text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <p>Tabs go here</p>
    </div>
  );
}
```

**Step 5: Verify routes work**

```bash
npm run dev
```

Visit `http://localhost:5173` — should show BoardView skeleton.
Visit `http://localhost:5173/admin` — should show AdminPanel skeleton.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add React Router with BoardView and AdminPanel routes"
```

---

## Task 5: Data Hooks (Real-time Supabase Subscriptions)

**Files:**

- Create: `src/hooks/useGameConfig.ts`
- Create: `src/hooks/useTeams.ts`
- Create: `src/hooks/useTiles.ts`
- Create: `src/hooks/useEvents.ts`
- Create: `src/hooks/useCards.ts`

These hooks fetch initial data and subscribe to real-time changes. The board view uses them to auto-update.

**Step 1: Create `src/hooks/useGameConfig.ts`**

```ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { GameConfig } from "../types/database";

export function useGameConfig() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("game_config")
      .select("*")
      .single()
      .then(({ data }) => {
        setConfig(data);
        setLoading(false);
      });

    const channel = supabase
      .channel("game_config_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_config" },
        (payload) => setConfig(payload.new as GameConfig)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { config, loading };
}
```

**Step 2: Create `src/hooks/useTeams.ts`**

```ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Team } from "../types/database";

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("teams")
      .select("*")
      .order("turn_order")
      .then(({ data }) => {
        setTeams(data ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel("teams_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        () => {
          supabase
            .from("teams")
            .select("*")
            .order("turn_order")
            .then(({ data }) => setTeams(data ?? []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { teams, loading };
}
```

**Step 3: Create `src/hooks/useTiles.ts`**

```ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Tile } from "../types/database";

export function useTiles() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("tiles")
      .select("*")
      .order("position")
      .then(({ data }) => {
        setTiles(data ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel("tiles_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tiles" },
        () => {
          supabase
            .from("tiles")
            .select("*")
            .order("position")
            .then(({ data }) => setTiles(data ?? []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { tiles, loading };
}
```

**Step 4: Create `src/hooks/useEvents.ts`**

```ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { GameEvent } from "../types/database";

export function useEvents(limit = 50) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = () =>
    supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => setEvents(data ?? []));

  useEffect(() => {
    fetchEvents().then(() => setLoading(false));

    const channel = supabase
      .channel("events_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { events, loading };
}
```

**Step 5: Create `src/hooks/useCards.ts`**

```ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Card, DeckType } from "../types/database";

export function useCards(deckType?: DeckType) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCards = () => {
    let query = supabase.from("cards").select("*").order("created_at");
    if (deckType) query = query.eq("deck_type", deckType);
    return query.then(({ data }) => setCards(data ?? []));
  };

  useEffect(() => {
    fetchCards().then(() => setLoading(false));

    const channel = supabase
      .channel("cards_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        () => fetchCards()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deckType]);

  return { cards, loading };
}
```

**Step 6: Verify the app still runs**

```bash
npm run dev
```

No errors in browser console.

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add real-time Supabase data hooks for all tables"
```

---

## Task 6: Board Geometry Utility

**Files:**

- Create: `src/utils/boardGeometry.ts`
- Create: `src/utils/boardGeometry.test.ts`

This utility calculates the position of each tile in the rectangular loop given `tilesPerSide`.

**Step 1: Write failing tests first**

Create `src/utils/boardGeometry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  getTileCount,
  getTileCoordinates,
  wrapPosition,
} from "./boardGeometry";

describe("getTileCount", () => {
  it("returns correct total for tilesPerSide=9", () => {
    // 4 sides × 9 tiles, minus 4 corners counted twice = (9-1)*4 = 32
    expect(getTileCount(9)).toBe(32);
  });

  it("returns correct total for tilesPerSide=5", () => {
    expect(getTileCount(5)).toBe(16);
  });
});

describe("getTileCoordinates", () => {
  it("returns grid coordinates for position 0 (bottom-left corner)", () => {
    const { col, row } = getTileCoordinates(0, 9);
    expect(col).toBe(0);
    expect(row).toBe(8); // bottom row (0-indexed, tilesPerSide-1)
  });

  it("returns coordinates for each side", () => {
    // Position 1: bottom row, moving right
    const { col, row } = getTileCoordinates(1, 9);
    expect(row).toBe(8);
    expect(col).toBe(1);
  });
});

describe("wrapPosition", () => {
  it("wraps position exceeding total back to 0", () => {
    expect(wrapPosition(32, 9)).toBe(0);
    expect(wrapPosition(33, 9)).toBe(1);
  });

  it("returns position unchanged if within bounds", () => {
    expect(wrapPosition(5, 9)).toBe(5);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test -- --run src/utils/boardGeometry.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement `src/utils/boardGeometry.ts`**

```ts
/**
 * A rectangular Monopoly-style board with `tilesPerSide` tiles per side.
 * Total tiles = (tilesPerSide - 1) * 4 (corners counted once).
 * Positions go clockwise starting from bottom-left (position 0 = Start).
 *
 * Layout (tilesPerSide=9, 32 total tiles):
 *   Top:    positions 16–24  (left to right)
 *   Right:  positions 8–16   (bottom to top)
 *   Bottom: positions 0–8    (left to right)
 *   Left:   positions 24–32  (top to bottom)
 */

export function getTileCount(tilesPerSide: number): number {
  return (tilesPerSide - 1) * 4;
}

export function getTileCoordinates(
  position: number,
  tilesPerSide: number
): { col: number; row: number } {
  const n = tilesPerSide - 1; // side length in segments
  const maxRow = tilesPerSide - 1;

  if (position < n) {
    // Bottom side: left to right
    return { col: position, row: maxRow };
  } else if (position < 2 * n) {
    // Right side: bottom to top
    return { col: maxRow, row: maxRow - (position - n) };
  } else if (position < 3 * n) {
    // Top side: right to left
    return { col: maxRow - (position - 2 * n), row: 0 };
  } else {
    // Left side: top to bottom
    return { col: 0, row: position - 3 * n };
  }
}

export function wrapPosition(position: number, tilesPerSide: number): number {
  const total = getTileCount(tilesPerSide);
  return position % total;
}

export function isCorner(position: number, tilesPerSide: number): boolean {
  const n = tilesPerSide - 1;
  return position % n === 0;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test -- --run src/utils/boardGeometry.test.ts
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add board geometry utility with tests"
```

---

## Task 7: Tile Color Mapping Utility

**Files:**

- Create: `src/utils/tileColors.ts`
- Create: `src/utils/tileColors.test.ts`

**Step 1: Write failing tests**

Create `src/utils/tileColors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getTileColors, SPECIAL_TILE_COLORS } from "./tileColors";
import type { TileType } from "../types/database";

describe("getTileColors", () => {
  it("returns blue for solo tiles", () => {
    const { bg } = getTileColors("solo");
    expect(bg).toContain("blue");
  });

  it("returns red for head_to_head tiles", () => {
    const { bg } = getTileColors("head_to_head");
    expect(bg).toContain("red");
  });

  it("returns special color for jail", () => {
    const { bg } = getTileColors("jail");
    expect(bg).toBeDefined();
  });

  it("returns special color for pot", () => {
    const { bg } = getTileColors("pot");
    expect(bg).toBeDefined();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test -- --run src/utils/tileColors.test.ts
```

**Step 3: Implement `src/utils/tileColors.ts`**

```ts
import type { TileType } from "../types/database";

interface TileColors {
  bg: string; // Tailwind background class
  text: string; // Tailwind text class
  border: string; // Tailwind border class
  label: string; // Human-readable label
}

const COLOR_MAP: Record<TileType, TileColors> = {
  solo: {
    bg: "bg-blue-600",
    text: "text-white",
    border: "border-blue-400",
    label: "Solo",
  },
  head_to_head: {
    bg: "bg-red-600",
    text: "text-white",
    border: "border-red-400",
    label: "Head to Head",
  },
  all_teams: {
    bg: "bg-green-600",
    text: "text-white",
    border: "border-green-400",
    label: "All Teams",
  },
  misc: {
    bg: "bg-yellow-500",
    text: "text-black",
    border: "border-yellow-300",
    label: "Misc",
  },
  start: {
    bg: "bg-gray-700",
    text: "text-white",
    border: "border-gray-500",
    label: "Start",
  },
  jail: {
    bg: "bg-orange-700",
    text: "text-white",
    border: "border-orange-500",
    label: "Jail",
  },
  pot: {
    bg: "bg-purple-600",
    text: "text-white",
    border: "border-purple-400",
    label: "Pot",
  },
  pay_taxes: {
    bg: "bg-pink-700",
    text: "text-white",
    border: "border-pink-500",
    label: "Pay Taxes",
  },
  chance: {
    bg: "bg-indigo-600",
    text: "text-white",
    border: "border-indigo-400",
    label: "Chance",
  },
  random: {
    bg: "bg-teal-600",
    text: "text-white",
    border: "border-teal-400",
    label: "Random",
  },
};

export function getTileColors(tileType: TileType): TileColors {
  return COLOR_MAP[tileType] ?? COLOR_MAP.misc;
}

export const SPECIAL_TILE_COLORS = COLOR_MAP;
```

**Step 4: Run tests**

```bash
npm run test -- --run src/utils/tileColors.test.ts
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add tile color mapping utility with tests"
```

---

## Task 8: Board Component

**Files:**

- Create: `src/components/Board.tsx`
- Create: `src/components/TileCell.tsx`
- Create: `src/components/TeamToken.tsx`

**Step 1: Create `src/components/TeamToken.tsx`**

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

**Step 2: Create `src/components/TileCell.tsx`**

```tsx
import type { Tile, Team } from "../types/database";
import { getTileColors } from "../utils/tileColors";
import TeamToken from "./TeamToken";

interface Props {
  tile: Tile;
  teams: Team[]; // teams currently on this tile
  isCurrent?: boolean; // is the current-turn team here?
  style?: React.CSSProperties;
}

export default function TileCell({ tile, teams, isCurrent, style }: Props) {
  const colors = getTileColors(tile.tile_type);

  return (
    <div
      className={`
        ${colors.bg} ${colors.text} ${colors.border}
        border-2 rounded flex flex-col items-center justify-between
        p-1 overflow-hidden relative
        ${isCurrent ? "ring-2 ring-white ring-offset-1" : ""}
      `}
      style={style}
    >
      {tile.image_url && (
        <img
          src={tile.image_url}
          alt={tile.label}
          className="w-full h-10 object-cover rounded mb-1"
        />
      )}
      <span className="text-center text-xs font-semibold leading-tight line-clamp-2 flex-1">
        {tile.label}
      </span>
      {teams.length > 0 && (
        <div className="flex flex-wrap gap-0.5 justify-center mt-1">
          {teams.map((team) => (
            <TeamToken key={team.id} team={team} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create `src/components/Board.tsx`**

```tsx
import type { Tile, Team, GameConfig } from "../types/database";
import { getTileCoordinates, getTileCount } from "../utils/boardGeometry";
import TileCell from "./TileCell";

interface Props {
  tiles: Tile[];
  teams: Team[];
  config: GameConfig;
}

export default function Board({ tiles, teams, config }: Props) {
  const { tiles_per_side: n } = config;
  const totalTiles = getTileCount(n);

  // Build a lookup: position → Tile
  const tileMap = new Map(tiles.map((t) => [t.position, t]));

  // Build a lookup: position → teams on that tile
  const teamsByPosition = new Map<number, Team[]>();
  for (const team of teams) {
    const list = teamsByPosition.get(team.position) ?? [];
    list.push(team);
    teamsByPosition.set(team.position, list);
  }

  const currentTeam = teams.find((t) => t.id === config.current_team_id);

  const tileSize = Math.floor(
    Math.min(
      (typeof window !== "undefined" ? window.innerWidth : 1200) / n,
      120
    )
  );

  return (
    <div
      className="relative mx-auto"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${n}, ${tileSize}px)`,
        gridTemplateRows: `repeat(${n}, ${tileSize}px)`,
        width: `${n * tileSize}px`,
        height: `${n * tileSize}px`,
      }}
    >
      {Array.from({ length: totalTiles }, (_, i) => {
        const tile = tileMap.get(i);
        const teamsHere = teamsByPosition.get(i) ?? [];
        const { col, row } = getTileCoordinates(i, n);
        const isCurrent = currentTeam
          ? teamsHere.some((t) => t.id === currentTeam.id)
          : false;

        if (!tile) return null;

        return (
          <TileCell
            key={i}
            tile={tile}
            teams={teamsHere}
            isCurrent={isCurrent}
            style={{
              gridColumn: col + 1,
              gridRow: row + 1,
              width: tileSize,
              height: tileSize,
            }}
          />
        );
      })}
    </div>
  );
}
```

**Step 4: Update `src/pages/BoardView.tsx` to use the Board component**

```tsx
import Board from "../components/Board";
import { useGameConfig } from "../hooks/useGameConfig";
import { useTeams } from "../hooks/useTeams";
import { useTiles } from "../hooks/useTiles";
import { useEvents } from "../hooks/useEvents";

export default function BoardView() {
  const { config, loading: configLoading } = useGameConfig();
  const { teams } = useTeams();
  const { tiles } = useTiles();
  const { events } = useEvents(10);

  if (configLoading || !config) {
    return (
      <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const sortedTeams = [...teams].sort((a, b) => a.turn_order - b.turn_order);

  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col overflow-hidden">
      {/* Top bar: scoreboard + event log */}
      <div className="h-[25vh] border-b border-gray-700 flex shrink-0">
        {/* Scoreboard */}
        <div className="flex-1 p-3 border-r border-gray-700 overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Scoreboard
            </h2>
            <span className="ml-auto text-xs text-purple-400 font-semibold">
              Pot: {config.pot_total} pts
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {sortedTeams.map((team) => (
              <div
                key={team.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border ${
                  team.id === config.current_team_id
                    ? "border-yellow-400"
                    : "border-gray-600"
                }`}
              >
                <span className="text-xl">{team.icon}</span>
                <div>
                  <div className="text-xs text-gray-400">{team.name}</div>
                  <div className="text-lg font-bold">{team.score}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Log */}
        <div className="w-80 p-3 overflow-y-auto">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">
            Recent Events
          </h2>
          <ul className="space-y-1">
            {events.map((event) => {
              const team = teams.find((t) => t.id === event.team_id);
              return (
                <li key={event.id} className="text-xs text-gray-300 flex gap-2">
                  <span>{team?.icon ?? "🎲"}</span>
                  <span>{formatEvent(event, team?.name)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <Board tiles={tiles} teams={teams} config={config} />
      </div>
    </div>
  );
}

function formatEvent(
  event: {
    event_type: string;
    spaces_moved?: number | null;
    tile_label?: string | null;
    points_delta?: number | null;
    notes?: string | null;
  },
  teamName?: string
): string {
  const name = teamName ?? "Unknown";
  switch (event.event_type) {
    case "move":
      return `${name} moved ${event.spaces_moved} spaces to "${event.tile_label}"`;
    case "score_change":
      return `${name} ${(event.points_delta ?? 0) >= 0 ? "+" : ""}${
        event.points_delta
      } pts${event.notes ? ` (${event.notes})` : ""}`;
    case "pot_claim":
      return `${name} claimed the pot!`;
    case "pot_contribution":
      return `${name} contributed ${Math.abs(event.points_delta ?? 0)} to pot`;
    case "card_reveal":
      return `Card revealed: ${event.notes}`;
    default:
      return event.notes ?? "";
  }
}
```

**Step 5: Verify the board renders**

```bash
npm run dev
```

Visit `/`. With real Supabase data (game_config row exists), the board should render. If tiles aren't seeded yet, it shows an empty grid.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Board, TileCell, TeamToken components and wire BoardView"
```

---

## Task 9: Tile Seeding Utility (Admin: Board Tab)

**Files:**

- Create: `src/utils/seedTiles.ts`
- Create: `src/utils/seedTiles.test.ts`

When the admin changes `tiles_per_side`, the existing tiles are deleted and new ones are generated.

**Step 1: Write failing tests**

Create `src/utils/seedTiles.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateDefaultTiles } from "./seedTiles";

describe("generateDefaultTiles", () => {
  it("generates correct number of tiles for tilesPerSide=9", () => {
    const tiles = generateDefaultTiles(9);
    expect(tiles.length).toBe(32);
  });

  it("sets position 0 as start tile", () => {
    const tiles = generateDefaultTiles(9);
    expect(tiles[0].tile_type).toBe("start");
    expect(tiles[0].position).toBe(0);
  });

  it("assigns sequential positions", () => {
    const tiles = generateDefaultTiles(5);
    tiles.forEach((tile, i) => expect(tile.position).toBe(i));
  });
});
```

**Step 2: Run to verify they fail**

```bash
npm run test -- --run src/utils/seedTiles.test.ts
```

**Step 3: Implement `src/utils/seedTiles.ts`**

```ts
import { getTileCount } from "./boardGeometry";
import type { TileType } from "../types/database";

interface TileSeed {
  position: number;
  label: string;
  tile_type: TileType;
  color_group: string;
  image_url: null;
}

const ACTIVITY_TYPES: TileType[] = [
  "solo",
  "head_to_head",
  "all_teams",
  "misc",
];

export function generateDefaultTiles(tilesPerSide: number): TileSeed[] {
  const total = getTileCount(tilesPerSide);
  const n = tilesPerSide - 1;

  return Array.from({ length: total }, (_, i) => {
    // Corners get special tiles
    if (i === 0)
      return {
        position: i,
        label: "Start",
        tile_type: "start" as TileType,
        color_group: "gray",
        image_url: null,
      };
    if (i === n)
      return {
        position: i,
        label: "Jail",
        tile_type: "jail" as TileType,
        color_group: "orange",
        image_url: null,
      };
    if (i === 2 * n)
      return {
        position: i,
        label: "Pot",
        tile_type: "pot" as TileType,
        color_group: "purple",
        image_url: null,
      };
    if (i === 3 * n)
      return {
        position: i,
        label: "Pay Taxes",
        tile_type: "pay_taxes" as TileType,
        color_group: "pink",
        image_url: null,
      };

    // Distribute Chance and Random tiles
    if (i === Math.floor(n / 2))
      return {
        position: i,
        label: "Chance",
        tile_type: "chance" as TileType,
        color_group: "indigo",
        image_url: null,
      };
    if (i === Math.floor((3 * n) / 2))
      return {
        position: i,
        label: "Chance",
        tile_type: "chance" as TileType,
        color_group: "indigo",
        image_url: null,
      };
    if (i === Math.floor((5 * n) / 2))
      return {
        position: i,
        label: "Random",
        tile_type: "random" as TileType,
        color_group: "teal",
        image_url: null,
      };
    if (i === Math.floor((7 * n) / 2))
      return {
        position: i,
        label: "Random",
        tile_type: "random" as TileType,
        color_group: "teal",
        image_url: null,
      };

    // Remaining tiles cycle through activity types
    const type = ACTIVITY_TYPES[i % ACTIVITY_TYPES.length];
    return {
      position: i,
      label: "Activity",
      tile_type: type,
      color_group: type,
      image_url: null,
    };
  });
}
```

**Step 4: Run tests**

```bash
npm run test -- --run src/utils/seedTiles.test.ts
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add tile seeding utility with tests"
```

---

## Task 10: Admin Panel — Teams Tab

**Files:**

- Create: `src/components/admin/TeamsTab.tsx`

**Step 1: Create `src/components/admin/TeamsTab.tsx`**

```tsx
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Team } from "../../types/database";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const ICON_OPTIONS = [
  "🎮",
  "🚀",
  "🌟",
  "🔥",
  "🎯",
  "🏆",
  "🦊",
  "🐲",
  "🎸",
  "⚡",
  "🌈",
  "🎲",
];

function SortableTeamRow({
  team,
  onDelete,
}: {
  team: Team;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: team.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [icon, setIcon] = useState(team.icon);

  const save = async () => {
    await supabase.from("teams").update({ name, icon }).eq("id", team.id);
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg border border-gray-600"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-500 select-none"
      >
        ⠿
      </span>
      {editing ? (
        <>
          <div className="flex flex-wrap gap-1">
            {ICON_OPTIONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`text-xl p-1 rounded ${
                  ic === icon ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-gray-700 text-white px-2 py-1 rounded flex-1"
          />
          <button
            onClick={save}
            className="text-green-400 font-semibold text-sm"
          >
            Save
          </button>
        </>
      ) : (
        <>
          <span className="text-2xl">{team.icon}</span>
          <span className="flex-1 font-semibold">{team.name}</span>
          <span className="text-gray-400 text-sm">{team.score} pts</span>
          <button
            onClick={() => setEditing(true)}
            className="text-blue-400 text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(team.id)}
            className="text-red-400 text-sm"
          >
            Remove
          </button>
        </>
      )}
    </div>
  );
}

export default function TeamsTab({ teams }: { teams: Team[] }) {
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("🎮");

  const addTeam = async () => {
    if (!newName.trim()) return;
    const maxOrder = teams.reduce((m, t) => Math.max(m, t.turn_order), -1);
    await supabase
      .from("teams")
      .insert({
        name: newName.trim(),
        icon: newIcon,
        turn_order: maxOrder + 1,
      });
    setNewName("");
  };

  const deleteTeam = async (id: string) => {
    await supabase.from("teams").delete().eq("id", id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = teams.findIndex((t) => t.id === active.id);
    const newIndex = teams.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(teams, oldIndex, newIndex);
    await Promise.all(
      reordered.map((team, i) =>
        supabase.from("teams").update({ turn_order: i }).eq("id", team.id)
      )
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Teams</h2>

      {/* Add team */}
      <div className="flex gap-2 items-center bg-gray-800 p-3 rounded-lg">
        <div className="flex gap-1 flex-wrap">
          {ICON_OPTIONS.map((ic) => (
            <button
              key={ic}
              onClick={() => setNewIcon(ic)}
              className={`text-xl p-1 rounded ${
                ic === newIcon ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              {ic}
            </button>
          ))}
        </div>
        <input
          placeholder="Team name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTeam()}
          className="bg-gray-700 text-white px-3 py-2 rounded flex-1"
        />
        <button
          onClick={addTeam}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-semibold"
        >
          Add Team
        </button>
      </div>

      {/* Team list (drag to reorder) */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={teams.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {teams.map((team) => (
              <SortableTeamRow
                key={team.id}
                team={team}
                onDelete={deleteTeam}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add admin Teams tab with drag-to-reorder"
```

---

## Task 11: Admin Panel — Board Tab

**Files:**

- Create: `src/components/admin/BoardTab.tsx`
- Create: `src/components/admin/TileEditor.tsx`

**Step 1: Create `src/components/admin/TileEditor.tsx`**

```tsx
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Tile, TileType } from "../../types/database";
import { getTileColors } from "../../utils/tileColors";

const TILE_TYPES: TileType[] = [
  "solo",
  "head_to_head",
  "all_teams",
  "misc",
  "start",
  "jail",
  "pot",
  "pay_taxes",
  "chance",
  "random",
];

export default function TileEditor({
  tile,
  onClose,
}: {
  tile: Tile;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(tile.label);
  const [tileType, setTileType] = useState<TileType>(tile.tile_type);
  const [imageUrl, setImageUrl] = useState(tile.image_url ?? "");

  const save = async () => {
    await supabase
      .from("tiles")
      .update({
        label,
        tile_type: tileType,
        color_group: tileType,
        image_url: imageUrl || null,
      })
      .eq("id", tile.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-600">
        <h3 className="text-lg font-bold">Edit Tile #{tile.position}</h3>

        <div>
          <label className="text-sm text-gray-400">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400">Type</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {TILE_TYPES.map((type) => {
              const colors = getTileColors(type);
              return (
                <button
                  key={type}
                  onClick={() => setTileType(type)}
                  className={`${colors.bg} ${
                    colors.text
                  } px-3 py-2 rounded text-sm font-semibold border-2 ${
                    tileType === type ? "border-white" : "border-transparent"
                  }`}
                >
                  {colors.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400">Image URL (optional)</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create `src/components/admin/BoardTab.tsx`**

```tsx
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Tile, GameConfig } from "../../types/database";
import { getTileColors } from "../../utils/tileColors";
import { generateDefaultTiles } from "../../utils/seedTiles";
import TileEditor from "./TileEditor";

interface Props {
  tiles: Tile[];
  config: GameConfig;
}

export default function BoardTab({ tiles, config }: Props) {
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [tilesPerSide, setTilesPerSide] = useState(config.tiles_per_side);
  const [resizing, setResizing] = useState(false);

  const resizeBoard = async () => {
    setResizing(true);
    // Delete all existing tiles
    await supabase
      .from("tiles")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    // Generate and insert new tiles
    const newTiles = generateDefaultTiles(tilesPerSide);
    await supabase.from("tiles").insert(newTiles);
    // Update config
    await supabase
      .from("game_config")
      .update({ tiles_per_side: tilesPerSide })
      .eq("id", config.id);
    setResizing(false);
  };

  const sortedTiles = [...tiles].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Board Configuration</h2>

      {/* Board size control */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 flex items-center gap-4">
        <label className="text-sm text-gray-400">Tiles per side:</label>
        <input
          type="number"
          min={5}
          max={15}
          value={tilesPerSide}
          onChange={(e) => setTilesPerSide(Number(e.target.value))}
          className="w-20 bg-gray-700 text-white px-2 py-1 rounded text-center"
        />
        <button
          onClick={resizeBoard}
          disabled={resizing}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold text-sm"
        >
          {resizing ? "Resizing..." : "Resize Board"}
        </button>
        <span className="text-xs text-gray-500">
          ⚠️ This resets all tile content
        </span>
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-4 gap-2">
        {sortedTiles.map((tile) => {
          const colors = getTileColors(tile.tile_type);
          return (
            <button
              key={tile.id}
              onClick={() => setSelectedTile(tile)}
              className={`${colors.bg} ${colors.text} p-2 rounded text-left text-xs border-2 ${colors.border} hover:opacity-90`}
            >
              <div className="font-bold">#{tile.position}</div>
              <div className="truncate">{tile.label}</div>
              <div className="text-[10px] opacity-75">
                {getTileColors(tile.tile_type).label}
              </div>
            </button>
          );
        })}
      </div>

      {selectedTile && (
        <TileEditor tile={selectedTile} onClose={() => setSelectedTile(null)} />
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add admin Board tab with tile editor modal"
```

---

## Task 12: Admin Panel — Game Tab

**Files:**

- Create: `src/components/admin/GameTab.tsx`

This is the main control during gameplay.

**Step 1: Create `src/components/admin/GameTab.tsx`**

```tsx
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Team, Tile, GameConfig } from "../../types/database";
import { wrapPosition, getTileCount } from "../../utils/boardGeometry";

interface Props {
  teams: Team[];
  tiles: Tile[];
  config: GameConfig;
}

export default function GameTab({ teams, tiles, config }: Props) {
  const [moveInputs, setMoveInputs] = useState<Record<string, string>>({});
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [scoreNotes, setScoreNotes] = useState<Record<string, string>>({});
  const [potInput, setPotInput] = useState("");

  const tileMap = new Map(tiles.map((t) => [t.position, t]));

  const moveTeam = async (team: Team) => {
    const spaces = parseInt(moveInputs[team.id] ?? "0");
    if (!spaces || spaces < 1) return;

    const totalTiles = getTileCount(config.tiles_per_side);
    const newPosition = wrapPosition(
      team.position + spaces,
      config.tiles_per_side
    );
    const landedTile = tileMap.get(newPosition);

    await supabase
      .from("teams")
      .update({ position: newPosition })
      .eq("id", team.id);

    // Log the move event
    await supabase.from("events").insert({
      event_type: "move",
      team_id: team.id,
      spaces_moved: spaces,
      from_position: team.position,
      to_position: newPosition,
      tile_label: landedTile?.label ?? "Unknown",
    });

    // Handle special tile effects
    if (landedTile) {
      await handleSpecialTile(team, landedTile);
    }

    setMoveInputs((prev) => ({ ...prev, [team.id]: "" }));
  };

  const handleSpecialTile = async (team: Team, tile: Tile) => {
    if (tile.tile_type === "jail") {
      const penalty = config.jail_penalty;
      await applyPenaltyToPot(team, penalty, `Jail penalty`);
    } else if (tile.tile_type === "pay_taxes") {
      const penalty = config.tax_penalty;
      await applyPenaltyToPot(team, penalty, `Tax penalty`);
    } else if (tile.tile_type === "pot") {
      const potAmount = config.pot_total;
      if (potAmount > 0) {
        await supabase
          .from("teams")
          .update({ score: team.score + potAmount })
          .eq("id", team.id);
        await supabase
          .from("game_config")
          .update({ pot_total: 0 })
          .eq("id", config.id);
        await supabase.from("events").insert({
          event_type: "pot_claim",
          team_id: team.id,
          points_delta: potAmount,
          notes: `Claimed pot of ${potAmount} points`,
        });
      }
    }
  };

  const applyPenaltyToPot = async (
    team: Team,
    amount: number,
    reason: string
  ) => {
    await supabase
      .from("teams")
      .update({ score: team.score - amount })
      .eq("id", team.id);
    await supabase
      .from("game_config")
      .update({ pot_total: config.pot_total + amount })
      .eq("id", config.id);
    await supabase.from("events").insert({
      event_type: "pot_contribution",
      team_id: team.id,
      points_delta: -amount,
      notes: reason,
    });
  };

  const adjustScore = async (team: Team, delta: number) => {
    const notes = scoreNotes[team.id]?.trim() || undefined;
    const newScore = team.score + delta;

    await supabase.from("teams").update({ score: newScore }).eq("id", team.id);
    await supabase.from("events").insert({
      event_type: "score_change",
      team_id: team.id,
      points_delta: delta,
      notes: notes ?? null,
    });

    setScoreInputs((prev) => ({ ...prev, [team.id]: "" }));
    setScoreNotes((prev) => ({ ...prev, [team.id]: "" }));
  };

  const addManualPenaltyToPot = async (team: Team) => {
    const amount = parseInt(scoreInputs[team.id] ?? "0");
    if (!amount || amount <= 0) return;
    const notes = scoreNotes[team.id]?.trim() || "Manual penalty";
    await applyPenaltyToPot(team, amount, notes);
    setScoreInputs((prev) => ({ ...prev, [team.id]: "" }));
    setScoreNotes((prev) => ({ ...prev, [team.id]: "" }));
  };

  const setCurrentTurn = async (teamId: string) => {
    await supabase
      .from("game_config")
      .update({ current_team_id: teamId })
      .eq("id", config.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Game Controls</h2>
        <div className="bg-purple-900 border border-purple-500 rounded-lg px-4 py-2">
          <span className="text-sm text-purple-300">Pot Total:</span>
          <span className="text-2xl font-bold text-purple-200 ml-2">
            {config.pot_total}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {teams.map((team) => {
          const currentTile = tileMap.get(team.position);
          const isCurrentTurn = team.id === config.current_team_id;
          return (
            <div
              key={team.id}
              className={`bg-gray-800 rounded-xl p-4 border-2 ${
                isCurrentTurn ? "border-yellow-400" : "border-gray-600"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{team.icon}</span>
                <div className="flex-1">
                  <div className="font-bold">{team.name}</div>
                  <div className="text-sm text-gray-400">
                    {team.score} pts · Tile {team.position}:{" "}
                    {currentTile?.label ?? "?"}
                  </div>
                </div>
                <button
                  onClick={() => setCurrentTurn(team.id)}
                  className={`text-xs px-2 py-1 rounded border ${
                    isCurrentTurn
                      ? "bg-yellow-500 text-black border-yellow-400"
                      : "border-gray-500 text-gray-400 hover:border-yellow-400 hover:text-yellow-400"
                  }`}
                >
                  {isCurrentTurn ? "Current Turn" : "Set Turn"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Move controls */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Dice Roll → Move
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={moveInputs[team.id] ?? ""}
                      onChange={(e) =>
                        setMoveInputs((prev) => ({
                          ...prev,
                          [team.id]: e.target.value,
                        }))
                      }
                      placeholder="Spaces"
                      className="flex-1 bg-gray-700 text-white px-2 py-1.5 rounded text-sm"
                    />
                    <button
                      onClick={() => moveTeam(team)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-semibold"
                    >
                      Move
                    </button>
                  </div>
                </div>

                {/* Score controls */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Adjust Score
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={scoreInputs[team.id] ?? ""}
                      onChange={(e) =>
                        setScoreInputs((prev) => ({
                          ...prev,
                          [team.id]: e.target.value,
                        }))
                      }
                      placeholder="Points"
                      className="flex-1 bg-gray-700 text-white px-2 py-1.5 rounded text-sm"
                    />
                    <button
                      onClick={() =>
                        adjustScore(team, parseInt(scoreInputs[team.id] ?? "0"))
                      }
                      className="bg-green-600 hover:bg-green-500 text-white px-2 py-1.5 rounded text-sm"
                    >
                      +
                    </button>
                    <button
                      onClick={() =>
                        adjustScore(
                          team,
                          -parseInt(scoreInputs[team.id] ?? "0")
                        )
                      }
                      className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded text-sm"
                    >
                      −
                    </button>
                    <button
                      onClick={() => addManualPenaltyToPot(team)}
                      className="bg-purple-700 hover:bg-purple-600 text-white px-2 py-1.5 rounded text-xs"
                    >
                      →Pot
                    </button>
                  </div>
                  <input
                    value={scoreNotes[team.id] ?? ""}
                    onChange={(e) =>
                      setScoreNotes((prev) => ({
                        ...prev,
                        [team.id]: e.target.value,
                      }))
                    }
                    placeholder="Notes (optional)"
                    className="mt-1 w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add admin Game tab with move, score, and pot controls"
```

---

## Task 13: Admin Panel — Card Decks Tab

**Files:**

- Create: `src/components/admin/CardDecksTab.tsx`

**Step 1: Create `src/components/admin/CardDecksTab.tsx`**

```tsx
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Card, DeckType } from "../../types/database";
import type { Team, GameConfig } from "../../types/database";

interface Props {
  cards: Card[];
  teams: Team[];
  config: GameConfig;
}

export default function CardDecksTab({ cards, teams, config }: Props) {
  const [newContent, setNewContent] = useState<Record<DeckType, string>>({
    chance: "",
    random: "",
  });
  const [revealedCard, setRevealedCard] = useState<Card | null>(null);

  const chanceCards = cards.filter((c) => c.deck_type === "chance");
  const randomCards = cards.filter((c) => c.deck_type === "random");

  const addCard = async (deck: DeckType) => {
    const content = newContent[deck].trim();
    if (!content) return;
    await supabase.from("cards").insert({ deck_type: deck, content });
    setNewContent((prev) => ({ ...prev, [deck]: "" }));
  };

  const deleteCard = async (id: string) => {
    await supabase.from("cards").delete().eq("id", id);
  };

  const drawCard = async (deck: DeckType) => {
    const pool = deck === "chance" ? chanceCards : randomCards;
    if (!pool.length) return;
    const card = pool[Math.floor(Math.random() * pool.length)];
    setRevealedCard(card);

    await supabase.from("events").insert({
      event_type: "card_reveal",
      notes: `[${deck.toUpperCase()}] ${card.content}`,
    });
  };

  const DeckSection = ({
    deck,
    deckCards,
  }: {
    deck: DeckType;
    deckCards: Card[];
  }) => (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-600 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg capitalize">
          {deck} Cards ({deckCards.length})
        </h3>
        <button
          onClick={() => drawCard(deck)}
          className={`px-4 py-2 rounded font-semibold text-sm ${
            deck === "chance"
              ? "bg-indigo-600 hover:bg-indigo-500"
              : "bg-teal-600 hover:bg-teal-500"
          } text-white`}
        >
          Draw {deck} Card
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={newContent[deck]}
          onChange={(e) =>
            setNewContent((prev) => ({ ...prev, [deck]: e.target.value }))
          }
          onKeyDown={(e) => e.key === "Enter" && addCard(deck)}
          placeholder={`Add a ${deck} card...`}
          className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
        />
        <button
          onClick={() => addCard(deck)}
          className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm"
        >
          Add
        </button>
      </div>

      <ul className="space-y-1 max-h-48 overflow-y-auto">
        {deckCards.map((card) => (
          <li
            key={card.id}
            className="flex gap-2 items-start text-sm bg-gray-700 px-3 py-2 rounded"
          >
            <span className="flex-1">{card.content}</span>
            <button
              onClick={() => deleteCard(card.id)}
              className="text-red-400 shrink-0"
            >
              ✕
            </button>
          </li>
        ))}
        {deckCards.length === 0 && (
          <li className="text-gray-500 text-sm italic">No cards yet</li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Card Decks</h2>
      <DeckSection deck="chance" deckCards={chanceCards} />
      <DeckSection deck="random" deckCards={randomCards} />

      {/* Revealed card overlay */}
      {revealedCard && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setRevealedCard(null)}
        >
          <div
            className={`max-w-lg w-full mx-4 rounded-2xl p-10 text-center border-4 shadow-2xl ${
              revealedCard.deck_type === "chance"
                ? "bg-indigo-700 border-indigo-400"
                : "bg-teal-700 border-teal-400"
            }`}
          >
            <div className="text-sm uppercase tracking-widest mb-4 opacity-75">
              {revealedCard.deck_type} Card
            </div>
            <div className="text-3xl font-bold leading-snug">
              {revealedCard.content}
            </div>
            <div className="mt-8 text-sm opacity-60">
              Click anywhere to dismiss
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add admin Card Decks tab with draw and reveal"
```

---

## Task 14: Admin Panel — Event Log Tab and Settings

**Files:**

- Create: `src/components/admin/EventLogTab.tsx`
- Create: `src/components/admin/SettingsTab.tsx`

**Step 1: Create `src/components/admin/EventLogTab.tsx`**

```tsx
import type { GameEvent, Team } from "../../types/database";

interface Props {
  events: GameEvent[];
  teams: Team[];
}

const EVENT_ICONS: Record<string, string> = {
  move: "📍",
  score_change: "📊",
  pot_contribution: "💰",
  pot_claim: "🏆",
  card_reveal: "🃏",
};

export default function EventLogTab({ events, teams }: Props) {
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Event Log ({events.length})</h2>
      <ul className="space-y-2">
        {events.map((event) => {
          const team = event.team_id ? teamMap.get(event.team_id) : null;
          const time = new Date(event.created_at).toLocaleTimeString();
          return (
            <li
              key={event.id}
              className="bg-gray-800 rounded-lg px-4 py-3 flex gap-3 items-start"
            >
              <span className="text-xl shrink-0">
                {EVENT_ICONS[event.event_type] ?? "📝"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 items-baseline">
                  {team && (
                    <span className="font-semibold">
                      {team.icon} {team.name}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{time}</span>
                </div>
                <div className="text-sm text-gray-300 mt-0.5">
                  {event.event_type === "move" &&
                    `Moved ${event.spaces_moved} spaces → "${event.tile_label}"`}
                  {event.event_type === "score_change" &&
                    `Score ${(event.points_delta ?? 0) >= 0 ? "+" : ""}${
                      event.points_delta
                    }${event.notes ? ` · ${event.notes}` : ""}`}
                  {event.event_type === "pot_contribution" &&
                    `Paid ${Math.abs(event.points_delta ?? 0)} pts to pot${
                      event.notes ? ` (${event.notes})` : ""
                    }`}
                  {event.event_type === "pot_claim" &&
                    `Claimed pot: +${event.points_delta} pts`}
                  {event.event_type === "card_reveal" && event.notes}
                </div>
              </div>
            </li>
          );
        })}
        {events.length === 0 && (
          <li className="text-gray-500 italic text-sm">No events yet</li>
        )}
      </ul>
    </div>
  );
}
```

**Step 2: Create `src/components/admin/SettingsTab.tsx`**

```tsx
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import type { GameConfig } from "../../types/database";

export default function SettingsTab({ config }: { config: GameConfig }) {
  const [gameName, setGameName] = useState(config.game_name);
  const [jailPenalty, setJailPenalty] = useState(config.jail_penalty);
  const [taxPenalty, setTaxPenalty] = useState(config.tax_penalty);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await supabase
      .from("game_config")
      .update({
        game_name: gameName,
        jail_penalty: jailPenalty,
        tax_penalty: taxPenalty,
      })
      .eq("id", config.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-xl font-bold">Settings</h2>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Game Name</label>
        <input
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-1">
          Jail Penalty (points)
        </label>
        <input
          type="number"
          value={jailPenalty}
          onChange={(e) => setJailPenalty(Number(e.target.value))}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded"
        />
        <p className="text-xs text-gray-500 mt-1">
          Points deducted when a team lands on Jail (goes into pot)
        </p>
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-1">
          Pay Taxes Penalty (points)
        </label>
        <input
          type="number"
          value={taxPenalty}
          onChange={(e) => setTaxPenalty(Number(e.target.value))}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded"
        />
        <p className="text-xs text-gray-500 mt-1">
          Points deducted when a team lands on Pay Taxes (goes into pot)
        </p>
      </div>

      <button
        onClick={save}
        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-semibold"
      >
        {saved ? "✓ Saved" : "Save Settings"}
      </button>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add admin Event Log and Settings tabs"
```

---

## Task 15: Wire Up the Full Admin Panel

**Files:**

- Modify: `src/pages/AdminPanel.tsx`

**Step 1: Replace `src/pages/AdminPanel.tsx`**

```tsx
import { useState } from "react";
import { useGameConfig } from "../hooks/useGameConfig";
import { useTeams } from "../hooks/useTeams";
import { useTiles } from "../hooks/useTiles";
import { useEvents } from "../hooks/useEvents";
import { useCards } from "../hooks/useCards";
import GameTab from "../components/admin/GameTab";
import TeamsTab from "../components/admin/TeamsTab";
import BoardTab from "../components/admin/BoardTab";
import CardDecksTab from "../components/admin/CardDecksTab";
import EventLogTab from "../components/admin/EventLogTab";
import SettingsTab from "../components/admin/SettingsTab";

type Tab = "game" | "teams" | "board" | "cards" | "events" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "game", label: "🎮 Game" },
  { id: "teams", label: "👥 Teams" },
  { id: "board", label: "🗺️ Board" },
  { id: "cards", label: "🃏 Cards" },
  { id: "events", label: "📋 Events" },
  { id: "settings", label: "⚙️ Settings" },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("game");
  const { config, loading } = useGameConfig();
  const { teams } = useTeams();
  const { tiles } = useTiles();
  const { events } = useEvents(200);
  const { cards } = useCards();

  if (loading || !config) {
    return (
      <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const sortedTeams = [...teams].sort((a, b) => a.turn_order - b.turn_order);

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <div className="border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">{config.game_name} · Admin</h1>
        <a
          href="/"
          target="_blank"
          className="text-sm text-blue-400 hover:underline"
        >
          Open Board View ↗
        </a>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {activeTab === "game" && (
          <GameTab teams={sortedTeams} tiles={tiles} config={config} />
        )}
        {activeTab === "teams" && <TeamsTab teams={sortedTeams} />}
        {activeTab === "board" && <BoardTab tiles={tiles} config={config} />}
        {activeTab === "cards" && (
          <CardDecksTab cards={cards} teams={sortedTeams} config={config} />
        )}
        {activeTab === "events" && (
          <EventLogTab events={events} teams={teams} />
        )}
        {activeTab === "settings" && <SettingsTab config={config} />}
      </div>
    </div>
  );
}
```

**Step 2: Run the full app and verify end-to-end**

```bash
npm run dev
```

Checklist:

- [ ] `/admin` loads with all 6 tabs
- [ ] Teams tab: add a team, verify it appears on board view in real-time
- [ ] Board tab: resize board and seed tiles, verify board view updates
- [ ] Game tab: move a team, verify avatar moves on board view
- [ ] Game tab: adjust score, verify scoreboard updates on board view
- [ ] Cards tab: draw a card, verify the overlay appears
- [ ] Settings tab: change jail penalty, verify it saves

**Step 3: Run all tests**

```bash
npm run test -- --run
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: wire up full admin panel with all tabs"
```

---

## Task 16: Polish and Final Touches

**Files:**

- Modify: `src/pages/BoardView.tsx` (connection status banner)
- Modify: `index.html` (page title)

**Step 1: Add reconnection banner to BoardView**

Add this to `BoardView.tsx` (use the Supabase channel `status` callback to track connection):

```tsx
// Add state at top of BoardView component:
const [connected, setConnected] = useState(true);

// In useEffect, track channel subscription status:
// (Add a connection status channel)
useEffect(() => {
  const channel = supabase.channel("connection_check").subscribe((status) => {
    setConnected(status === "SUBSCRIBED");
  });
  return () => {
    supabase.removeChannel(channel);
  };
}, []);

// Add banner in JSX (above top bar):
{
  !connected && (
    <div className="bg-yellow-600 text-black text-xs text-center py-1 px-4">
      Reconnecting to server...
    </div>
  );
}
```

**Step 2: Update page title in `index.html`**

```html
<title>Geo Party</title>
```

**Step 3: Final test run**

```bash
npm run test -- --run
```

**Step 4: Final commit**

```bash
git add -A && git commit -m "feat: add reconnection banner and final polish"
```

---

## Running the App

```bash
# Development
npm run dev
# Board view: http://localhost:5173
# Admin panel: http://localhost:5173/admin

# Run tests
npm run test -- --run

# Build for production
npm run build
npm run preview
```

## Setup Checklist

1. [ ] Create Supabase project at supabase.com
2. [ ] Run `supabase/schema.sql` in Supabase SQL Editor
3. [ ] Disable RLS on all tables
4. [ ] Copy Project URL and anon key into `.env.local`
5. [ ] `npm install && npm run dev`
6. [ ] Go to `/admin` → Board tab → set tiles per side → click "Resize Board" to seed tiles
7. [ ] Add teams in Teams tab
8. [ ] Add Chance and Random cards in Cards tab
9. [ ] Open `/` on the projector/TV, keep `/admin` on your device
