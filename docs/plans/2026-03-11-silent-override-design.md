# Silent Team Override — Design Document

**Date:** 2026-03-11
**Status:** Approved

---

## Overview

Add a silent override capability to the admin Game tab that lets the host directly set any team's score or board position to an absolute value, with no event logged and no game side-effects triggered. This is intended for corrections, host adjustments, or other out-of-band changes that should not appear in the player-visible event feed.

---

## UI Placement

Each team card in `GameTab` (`src/components/admin/GameTab.tsx`) gets a small wrench toggle button (`🔧`) placed in the card header row, next to the existing "Set Turn" button. Clicking the wrench expands a sub-panel at the bottom of that team's card.

The toggle is per-team local React state. All override panels default to collapsed. State resets on re-render (no persistence needed).

---

## Override Panel

The expanded panel contains two independent fields:

| Field           | Input                             | Action                                     |
| --------------- | --------------------------------- | ------------------------------------------ |
| Set score to    | `number` input                    | "Set" button → writes `teams.score = N`    |
| Set position to | `number` input (0 – totalTiles−1) | "Set" button → writes `teams.position = N` |

Each field acts independently. Only the field that is submitted changes; the other is unaffected.

### Visual Style

- Dark dashed border to visually separate from normal controls
- Dimmer/muted text and input styling
- Small label at the top: **"Admin Override — not logged"** in a warning-amber or gray tone
- Compact layout to minimize card height growth

---

## Behavior

### What happens

1. Admin expands the override panel for a team
2. Admin enters a value in "Set score to" or "Set position to"
3. Admin clicks "Set"
4. A single Supabase update is issued: `supabase.from('teams').update({ score: N }).eq('id', team.id)` (or `position: N`)
5. Supabase real-time pushes the update to the board view
6. The board view reflects the new value instantly

### What does NOT happen

- No row is inserted into the `events` table
- No special tile logic is triggered (no pot, jail, or tax effects)
- No board move animation
- Nothing appears in the board view event log feed or the admin Event Log tab

---

## Data Flow

```
Admin enters absolute value
  → clicks "Set"
    → supabase.from('teams').update({ score | position: N }).eq('id', team.id)
      → Supabase real-time subscription
        → Board view re-renders with new value
```

No additional database tables, columns, or migrations are required.

---

## Out of Scope

- Logging silent overrides to any audit trail
- Undo/redo of override actions
- Overriding pot total, tile config, or turn order via this panel
