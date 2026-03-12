# Move Animation Design

## Feature

When a team moves, the board zooms in (2.5×) and pans tile-by-tile along the move path.
The team's avatar hops each square with spring physics. On completion, the board springs back.

## Trigger

New `move` event inserted into `events` table. Event contains `from_position`, `to_position`, `team_id`.

## Path

Sequential positions from `from_position` to `to_position` stepping +1 with wrap. Computed by `computeMovePath()` added to `boardGeometry.ts`.

## Camera

`motion.div` wraps `<Board>` in `BoardView`. Animates `x`, `y`, `scale` (framer-motion).

- Scale: 1 → 2.5 when animating
- x = -(tileX - boardPx/2) * scale, y = -(tileY - boardPx/2) * scale
- Transition: spring { stiffness: 150, damping: 35 }

## Avatar overlay

Absolutely-positioned `motion.div` inside Board's grid div. Animates `left`/`top` to each tile's pixel center.
Transition: spring { stiffness: 400, damping: 35 }.

## Timing

~300ms per step (scaled: max 250ms, min 450ms based on path length).
1200ms hold after last step before zoom-out.

## Components changed

- NEW: src/hooks/useMoveAnimation.ts
- MOD: src/utils/boardGeometry.ts (add computeMovePath)
- MOD: src/components/Board.tsx (overlay avatar, filter animating team)
- MOD: src/pages/BoardView.tsx (camera motion.div, wire hook)
