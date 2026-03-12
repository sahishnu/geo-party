/**
 * Rectangular Monopoly-style board geometry.
 * Tiles are arranged around the perimeter of a grid, going clockwise:
 *   Bottom: left to right (positions 0 to n-1)
 *   Right:  bottom to top (positions n to 2n-1)
 *   Top:    right to left (positions 2n to 3n-1)
 *   Left:   top to bottom (positions 3n to 4n-1)
 * where n = tilesPerSide - 1.
 * Position 0 is the Start corner (bottom-left).
 */

export function getTileCount(tilesPerSide: number): number {
  return (tilesPerSide - 1) * 4
}

export function getTileCoordinates(
  position: number,
  tilesPerSide: number
): { col: number; row: number } {
  const n = tilesPerSide - 1
  const maxRow = tilesPerSide - 1

  if (position < n) {
    // Bottom side: left to right
    return { col: position, row: maxRow }
  } else if (position < 2 * n) {
    // Right side: bottom to top
    return { col: maxRow, row: maxRow - (position - n) }
  } else if (position < 3 * n) {
    // Top side: right to left
    return { col: maxRow - (position - 2 * n), row: 0 }
  } else {
    // Left side: top to bottom
    return { col: 0, row: position - 3 * n }
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
  if (position < n) return 'bottom'
  if (position < 2 * n) return 'right'
  if (position < 3 * n) return 'top'
  return 'left'
}

export function wrapPosition(position: number, tilesPerSide: number): number {
  const total = getTileCount(tilesPerSide)
  return position % total
}

export function isCorner(position: number, tilesPerSide: number): boolean {
  const n = tilesPerSide - 1
  return position % n === 0
}
