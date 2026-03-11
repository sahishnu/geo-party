# Geo Party — Design Document

**Date:** 2026-03-11
**Status:** Approved

---

## Overview

Geo Party is a digital Monopoly-style board game display built to facilitate an in-person group activity. It is a **presentation layer only** — no multiplayer logic, no game engine. A host (admin) controls everything through an admin panel while participants view a shared screen on a projector or TV. Up to six teams move around a configurable rectangular board based on real-life dice rolls, complete activities on tiles, and accumulate points.

---

## Tech Stack

- **Frontend:** React (Vite + TypeScript) + Tailwind CSS + React Router
- **Backend/Database:** Supabase (PostgreSQL + real-time subscriptions)
- **Hosting:** Local or any static host (Vercel, Netlify)

No custom backend is required. Supabase handles persistence and real-time sync between the admin panel and board view.

---

## Application Structure

Two routes in a single React app:

| Route | Purpose |
|---|---|
| `/` | Board View — fullscreen display for the projector/TV |
| `/admin` | Admin Panel — host control interface |

The board view subscribes to Supabase real-time and updates instantly whenever the admin makes any change.

---

## Layout

### Board View (`/`)

```
┌─────────────────────────────────────────────────────────┐
│  SCOREBOARD (teams + scores)  │  EVENT LOG (recent feed) │  ← top 1/4
├─────────────────────────────────────────────────────────┤
│                                                         │
│                  RECTANGULAR BOARD                      │  ← bottom 3/4
│              (full width, Monopoly-style loop)          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Top 1/4:** Full-width horizontal bar. Left side shows all teams with their icon, name, and current score (ordered by turn sequence). Right side shows the event log feed (most recent ~10 events).
- **Bottom 3/4:** The full-width rectangular board. Tiles are arranged around the perimeter of a rectangle. Team avatar icons sit on their current tile; multiple teams on the same tile fan out. A "current turn" indicator highlights the active team.

### Admin Panel (`/admin`)

A tabbed interface with five tabs:

1. **Game** — main play controls (move teams, adjust scores, set current turn, view pot total)
2. **Teams** — create/remove teams, set name and icon, drag to reorder turn sequence
3. **Board** — configure tiles per side, click any tile to edit label, color/type, image
4. **Card Decks** — manage Chance and Random card decks (add, edit, remove cards)
5. **Event Log** — read-only full history of all moves and score events

---

## Database Schema

### `game_config` (single row)
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `game_name` | text | Display name for the game |
| `tiles_per_side` | integer | Number of tiles on each side of the board (e.g., 9) |
| `jail_penalty` | integer | Fixed points deducted when landing on Jail |
| `tax_penalty` | integer | Fixed points deducted when landing on Pay Taxes |
| `pot_total` | integer | Running accumulated pot points |
| `current_team_id` | uuid | FK → teams, whose turn it currently is |

### `tiles` (one row per tile)
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `position` | integer | 0-indexed position around the board loop |
| `label` | text | Activity or tile name |
| `image_url` | text | Optional image |
| `tile_type` | enum | `solo`, `head_to_head`, `all_teams`, `misc`, `start`, `jail`, `pot`, `pay_taxes`, `chance`, `random` |
| `color_group` | text | Color used for activity tiles (maps to tile_type) |

### `teams` (one row per team)
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Team name |
| `icon` | text | Emoji or icon identifier |
| `score` | integer | Current point total |
| `position` | integer | Current tile position (0-indexed) |
| `turn_order` | integer | Sequence for play order |

### `events` (append-only log)
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `created_at` | timestamp | When the event occurred |
| `event_type` | enum | `move`, `score_change`, `pot_claim`, `pot_contribution`, `card_reveal` |
| `team_id` | uuid | FK → teams |
| `spaces_moved` | integer | (move events) how many tiles moved |
| `from_position` | integer | (move events) previous tile position |
| `to_position` | integer | (move events) new tile position |
| `tile_label` | text | (move events) label of tile landed on |
| `points_delta` | integer | (score events) positive = added, negative = subtracted |
| `notes` | text | Freeform context (e.g., "Team A won head-to-head trivia") |

### `cards` (one row per card)
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `deck_type` | enum | `chance` or `random` |
| `content` | text | The card's prompt or consequence text |

---

## Tile Types

### Color-coded Activity Tiles
These tiles have an activity label and optional image. Their color determines the game mode:

| Color | Game Mode | Description |
|---|---|---|
| Blue | Solo | One team plays the challenge alone |
| Red | Head-to-head | Two teams compete against each other |
| Green | All Teams | All six teams participate |
| Yellow | Miscellaneous | Admin's discretion |

### Special Tiles
| Tile | Behavior |
|---|---|
| **Start** | Corner tile; teams loop through it each circuit |
| **Jail** | Deducts `jail_penalty` points from the landing team; those points go into the pot |
| **Pay Taxes** | Deducts `tax_penalty` points from the landing team; those points go into the pot |
| **Pot** | Landing team claims the entire `pot_total`; pot resets to zero |
| **Chance** | Admin reveals a random card from the Chance deck |
| **Random** | Admin reveals a random card from the Random deck (separate from Chance) |

---

## Pot Mechanics

The running pot accumulates from two sources:
1. **Jail penalties** — when a team lands on Jail, `jail_penalty` points are deducted from their score and added to `pot_total`
2. **Pay Taxes penalties** — same as Jail but using `tax_penalty`
3. **Manual admin penalties** — when the admin deducts points from any team as a penalty, those points are optionally routable to the pot

When a team lands on the Pot tile, they receive the full `pot_total` added to their score, and `pot_total` resets to zero. Both the deduction and the claim are logged in the event log.

The current pot total is displayed prominently in the admin panel and on the board view scoreboard.

---

## Card Decks

Two separate decks: **Chance** and **Random** (analogous to Monopoly's Chance and Community Chest).

- Admin pre-loads cards via the Card Decks tab in the admin panel
- When a team lands on a Chance or Random tile, the admin taps "Reveal Card" — the app randomly selects a card from the appropriate deck and displays it prominently on the board view
- The reveal is logged in the event log with the card content
- Cards are not removed from the deck after being drawn (reshuffle/reuse)

---

## Event Log

All significant actions are logged to the `events` table:

| Event Type | Logged When |
|---|---|
| `move` | Admin moves a team (records spaces moved, tile landed on) |
| `score_change` | Admin adds or subtracts points from a team |
| `pot_contribution` | Points are added to the pot (Jail, Tax, or manual penalty) |
| `pot_claim` | A team lands on the Pot tile and claims it |
| `card_reveal` | A Chance or Random card is revealed |

The board view shows the most recent ~10 events. The admin panel Event Log tab shows the full history.

---

## Error Handling

- **Connection loss:** Board view shows a subtle "reconnecting..." banner; resumes automatically on reconnect. No data is lost.
- **Board wrap-around:** Moving past the last tile loops back to position 0 (Start). The event log notes the completed lap.
- **Empty tiles:** Tiles with no label show "Unnamed Tile" as a placeholder so the board never appears broken.
- **Optimistic updates:** Admin panel actions update the UI immediately. If a database write fails, a toast notification appears and the action is retried silently.
- **Empty pot claim:** If a team lands on the Pot tile when `pot_total` is 0, the event is still logged but no points are awarded.

---

## Out of Scope

- Real-time multiplayer or networked game logic
- Team self-service (teams cannot interact with the app directly)
- Automated dice rolling (dice are physical, admin enters the result)
- Authentication/access control on the admin panel (assumed to be used by a trusted host)
