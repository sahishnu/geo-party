import { describe, it, expect } from 'vitest'
import { getCameraTransform } from './cameraTransform'
import { getTileCoordinates } from './boardGeometry'

describe('getCameraTransform', () => {
  const n = 10        // tilesPerSide
  const tileSize = 80 // px
  const boardPx = n * tileSize // 800

  it('returns scale 1 and x/y 0 when not animating', () => {
    const result = getCameraTransform(null, n, tileSize, boardPx)
    expect(result).toEqual({ x: 0, y: 0, scale: 1 })
  })

  it('centers the board on position 0 (bottom-left corner)', () => {
    const { col, row } = getTileCoordinates(0, n)
    const tileX = col * tileSize + tileSize / 2
    const tileY = row * tileSize + tileSize / 2
    const S = 2.5
    const result = getCameraTransform(0, n, tileSize, boardPx)
    expect(result.scale).toBe(S)
    expect(result.x).toBeCloseTo(-(tileX - boardPx / 2) * S)
    expect(result.y).toBeCloseTo(-(tileY - boardPx / 2) * S)
  })
})
