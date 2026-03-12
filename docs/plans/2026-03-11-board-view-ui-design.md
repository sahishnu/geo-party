# Board View UI Redesign — Design Document

**Date:** 2026-03-11
**Status:** Approved

---

## Overview

Redesign the Geo Party board view (`/`) from a dark, flat UI into a light, fun, professionally-designed game interface. The aesthetic direction is **Confetti Carnival**: warm white background, vibrant team identity colors, rounded bubbly components, Nunito typography, and smooth animations. No hard dividers between sections — spacing, soft shadows, and color do all the separation work.

The reference layout (approved by user) mirrors a Monopoly-style digital board game:

- Horizontal player cards strip at the top
- Board filling the main area (center/left)
- Game log as a vertical feed on the right

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Avatar Card]  [Avatar Card]  [Avatar Card]  ...  [Pot]    │  ← ~22vh top strip
│                                                             │
│  ┌──────────────────────────────────────┐  ┌─────────────┐  │
│  │                                      │  │  Game Log   │  │
│  │           BOARD                      │  │  feed       │  │
│  │                                      │  │             │  │
│  └──────────────────────────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- **Top strip (~22vh):** Horizontal row of player avatar cards + pot pill. No bottom border — just natural spacing separates it from the board area.
- **Main area:** Board on the left (takes most of the width), Game Log feed on the right (~280px wide).
- **Overall background:** Warm white `#FAFAF8` with a faint SVG dot-grid texture for depth.

---

## Color & Identity System

Each team is assigned one of six vibrant identity colors by `turn_order` (1-indexed). This color is used for the avatar background, card accent bar, scoreboard highlight, token on the board, and event log pip.

| Turn Order | Color Name | Hex       |
| ---------- | ---------- | --------- |
| 1          | Coral      | `#FF6B6B` |
| 2          | Teal       | `#4ECDC4` |
| 3          | Lime       | `#95E06C` |
| 4          | Violet     | `#A78BFA` |
| 5          | Tangerine  | `#FFB347` |
| 6          | Mint       | `#67E8C5` |

A new utility `src/utils/teamColors.ts` will export `getTeamColor(turnOrder: number): string`.

---

## Typography

- **Font:** Nunito (Google Fonts) — rounded, playful, highly legible at distance (projector-friendly)
- Load via `<link>` in `index.html`, weights 400 / 600 / 700 / 800
- Apply globally via `body { font-family: 'Nunito', sans-serif; }`
- Score numbers: Nunito 800 (extra-bold), large size
- Team names: Nunito 700
- Event log text: Nunito 600 for team name prefix, 400 for description

---

## Player Avatar Cards (Scoreboard Strip)

Each team gets a card component (`PlayerCard`):

- Shape: `rounded-2xl bg-white` with soft drop shadow (`shadow-md`)
- Left accent: 4px colored left border in team color
- Avatar: circular `~52px`, team color as background fill, emoji centered at `text-2xl`
- Team name: bold, dark charcoal, below or beside avatar
- Score: large chunky number in team's color (`text-3xl font-extrabold`)
- **Active turn state:** card gets a glowing ring in team color + subtle scale-up (`scale-105`) + small animated "PLAYING" badge (rounded pill, team color bg, white text, tiny bounce animation)
- Cards are arranged in a horizontal `flex` row with `gap-3`, left-aligned

**Pot Pill** floats to the far right of the strip:

- Rounded pill, amber/gold gradient background
- Gold coin emoji + "Pot" label + point total
- Glows softly if `pot_total > 0`

---

## Game Log Feed

- Positioned to the right of the board, `~280px` wide, full height of the main area
- No border separating it from the board — just spacing and slightly different background region (perhaps a very faint `bg-white/60 rounded-2xl` card wrapping the feed)
- Header: "Game Log" in Nunito 700, with a small clock/history icon
- Each event row:
  - Small circular team avatar (team color bg + emoji, ~28px) on the left
  - Team name in bold + event description
  - Timestamp ("Just now", "2m ago") in light gray
- Newest event at the top
- Opacity fades: most recent = full opacity, older events gradually fade (via `opacity` steps)
- New events animate in: slide-down + fade-in (`@keyframes slideIn`)
- Shows last 10 events

---

## Board & Tile Updates

The board tiles receive a light-theme refresh:

- Overall board background: soft light gray or white instead of `bg-gray-900`
- Tile colors remain the same type-coded scheme (blue/red/green/yellow/etc.) — tile colors stay bold since they convey game information
- Tile borders: slightly softer, `rounded-md` corners

---

## Team Tokens on Tiles

`TeamToken` component is upgraded:

- Circle diameter: `32px` on board tiles (up from current 28px)
- Background: team's identity color (from `getTeamColor`) instead of `bg-black/40`
- Emoji: `text-lg`, centered
- Border: `2px solid white` ring so overlapping tokens remain distinct
- Multiple tokens on same tile: `flex-wrap` cluster with slight overlap (`-ml-1` on subsequent tokens)
- Size variants: `sm` (board tokens), `md` (avatar card)

---

## Files to Change

| File                              | Change                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `index.html`                      | Add Nunito Google Fonts link                                                 |
| `src/utils/teamColors.ts`         | New file — team color lookup by turn_order                                   |
| `src/pages/BoardView.tsx`         | Full layout restructure: light bg, player card strip, board+log side-by-side |
| `src/components/Board.tsx`        | Pass team colors through; light board wrapper background                     |
| `src/components/TileCell.tsx`     | Light-theme border/bg adjustments                                            |
| `src/components/TeamToken.tsx`    | Use team identity color; updated sizing/border                               |
| `src/components/PlayerCard.tsx`   | New component — avatar card for scoreboard strip                             |
| `src/components/EventLogFeed.tsx` | New component — styled game log feed                                         |

---

## Out of Scope

- Admin panel styling (unchanged)
- Tile type color scheme (unchanged — colors convey game info)
- Mobile responsiveness (projector display only)
- Dark mode
