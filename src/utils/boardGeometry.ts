/**
 * Rectangular Monopoly-style board geometry.
 * Tiles are arranged around the perimeter of a grid, going clockwise:
 *   Top:    left to right (positions 0 to n-1)
 *   Right:  top to bottom (positions n to 2n-1)
 *   Bottom: right to left (positions 2n to 3n-1)
 *   Left:   bottom to top (positions 3n to 4n-1)
 * where n = tilesPerSide - 1.
 * Position 0 is the Start corner (top-left).
 */

export function getTileCount(tilesPerSide: number): number {
  return (tilesPerSide - 1) * 4
}

export function getTileCoordinates(
  position: number,
  tilesPerSide: number
): { col: number; row: number } {
  const n = tilesPerSide - 1
  const maxCol = tilesPerSide - 1
  const maxRow = tilesPerSide - 1

  if (position < n) {
    // Top side: left to right
    return { col: position, row: 0 }
  } else if (position < 2 * n) {
    // Right side: top to bottom
    return { col: maxCol, row: position - n }
  } else if (position < 3 * n) {
    // Bottom side: right to left
    return { col: maxCol - (position - 2 * n), row: maxRow }
  } else {
    // Left side: bottom to top
    return { col: 0, row: maxRow - (position - 3 * n) }
  }
}

export type TileSide = 'bottom' | 'right' | 'top' | 'left' | 'corner'

/**
 * Returns which side of the board a tile is on, used to determine
 * which edge of the tile faces the board center (for the stripe).
 * Corners are identified first; otherwise derives from position ranges.
 */
export function getTileSide(position: number, tilesPerSide: number): TileSide {
  const n = tilesPerSide - 1
  if (position % n === 0) return 'corner'
  if (position < n) return 'top'
  if (position < 2 * n) return 'right'
  if (position < 3 * n) return 'bottom'
  return 'left'
}

export function wrapPosition(position: number, tilesPerSide: number): number {
  const total = getTileCount(tilesPerSide)
  return position % total
}

/**
 * Returns the sequence of board positions from `from` to `to` (inclusive),
 * stepping +1 and wrapping around the perimeter.
 */
export function computeMovePath(
  from: number,
  to: number,
  tilesPerSide: number
): number[] {
  const total = getTileCount(tilesPerSide)
  if (from === to) return [from]
  const path: number[] = [from]
  let pos = from
  while (pos !== to) {
    pos = (pos + 1) % total
    path.push(pos)
  }
  return path
}

export function isCorner(position: number, tilesPerSide: number): boolean {
  const n = tilesPerSide - 1
  return position % n === 0
}
