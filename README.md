# 🎲 JeoParty

Multiplayer board-game party app built with React, Supabase (realtime), and Tailwind. Teams move around a board, land on tiles (solo, head-to-head, all-teams, chance, etc.), and compete in activities to earn points.

## Setup

### 1. Supabase

- Create a [Supabase](https://supabase.com) project
- Run `supabase/schema.sql` in the SQL Editor
- Enable Realtime replication for all tables (Dashboard → Database → Replication)

### 2. Env vars

Create `.env.local`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### 3. Run

```bash
npm install
npm run dev        # start dev server
npm run build      # production build
npm test           # run tests
```

## Routes

| Path     | View          |
| -------- | ------------- |
| `/`      | Game board    |
| `/admin` | Admin panel   |

## Tech

React 18 · React Router · Supabase · Tailwind CSS · Framer Motion · dnd-kit · Vite · Vitest
