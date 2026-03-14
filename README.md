# 🎲 JeoParty

Multiplayer board-game party app built with React, Supabase (realtime), and Tailwind. Teams move around a board, land on tiles (solo, head-to-head, all-teams, chance, etc.), and compete in activities to earn points.

## Setup

### 1. Supabase

#### Option A: Local (Docker)

Requires [Docker Desktop](https://docs.docker.com/desktop/) and the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
brew install supabase/tap/supabase
supabase start   # pulls images & applies migrations automatically
```

The local credentials are already configured in `.env`. Once running:

| Service   | URL                                                         |
| --------- | ----------------------------------------------------------- |
| Studio UI | http://127.0.0.1:54323                                      |
| API       | http://127.0.0.1:54321                                      |
| Database  | `postgresql://postgres:postgres@127.0.0.1:54322/postgres`   |

#### Option B: Hosted

- Create a [Supabase](https://supabase.com) project
- Run `supabase/schema.sql` in the SQL Editor
- Enable Realtime replication for all tables (Dashboard → Database → Replication)
- Add your project credentials to `.env.hosted`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### 2. Run

```bash
npm install
npm run dev            # local Docker Supabase
npm run dev:hosted     # hosted Supabase
npm run build          # production build
npm test               # run tests
```

## Routes

| Path     | View          |
| -------- | ------------- |
| `/`      | Game board    |
| `/admin` | Admin panel   |

## Tech

React 18 · React Router · Supabase · Tailwind CSS · Framer Motion · dnd-kit · Vite · Vitest
