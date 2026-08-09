# 🎲 JeoParty

A live board-game party app built with React, Tailwind, and Framer Motion. Teams move around a board, land on tiles (solo, head-to-head, all-teams, chance, etc.), and compete in activities to earn points.

It runs **fully in the browser — no backend, no database.** Game state lives in `localStorage` and syncs between windows over a `BroadcastChannel`, so it deploys as a static site.

## How it works

JeoParty is a **single-host** party game:

- **`/admin`** — the control panel, and the source of truth. One person drives the game here (moves, scores, card flips, timers).
- **`/`** — the board, a read-only display for everyone to watch (e.g. on a projector).

Open both in two browser windows on the same machine: actions in the admin window appear on the board instantly. There's an **"Open admin ↗"** link on the board and an **"Open Board View ↗"** link in the admin panel.

State persists across refreshes (localStorage) and resets from the bundled demo data in `src/data/seed.json` — either on first load, or any time via **Settings → Reset to demo data**.

> **Note on scope:** because sync is `BroadcastChannel` + `localStorage`, play is same-origin, same-machine (two windows/tabs), not across separate devices. That's the natural shape of a single-host party game and keeps it a zero-backend static deploy. Cross-device play would need a small realtime server — deliberately out of scope here.

## Run

```bash
npm install
npm run dev      # start the dev server (no env vars needed)
npm run build    # production build → dist/
npm run preview  # preview the production build
npm test         # run the test suite
```

## Routes

| Path     | View          |
| -------- | ------------- |
| `/`      | Game board    |
| `/admin` | Admin panel   |

## Architecture

- [`src/lib/store.ts`](src/lib/store.ts) — the local, database-free backend: in-memory state mirrored to `localStorage`, with change + broadcast pub/sub and cross-window sync via `BroadcastChannel`.
- [`src/lib/supabase.ts`](src/lib/supabase.ts) — a thin Supabase-compatible facade over the store (chainable query builder + channels), so the hooks and admin components are unchanged. There is no network and no Supabase client.

## Tech

React 18 · React Router · Tailwind CSS · Framer Motion · dnd-kit · Vite · Vitest
