import { getTileCoordinates } from './boardGeometry'

const CAMERA_SCALE = 2.5

export function getCameraTransform(
  position: number | null,
  tilesPerSide: number,
  tileSize: number,
  boardPx: number
): { x: number; y: number; scale: number } {
  if (position === null) return { x: 0, y: 0, scale: 1 }

  const { col, row } = getTileCoordinates(position, tilesPerSide)
  const tileX = col * tileSize + tileSize / 2
  const tileY = row * tileSize + tileSize / 2
  const S = CAMERA_SCALE

  return {
    x: -(tileX - boardPx / 2) * S,
    y: -(tileY - boardPx / 2) * S,
    scale: S,
  }
}
