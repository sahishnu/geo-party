import { describe, it, expect } from 'vitest'
import { getTileCount, getTileCoordinates, wrapPosition, isCorner, computeMovePath } from './boardGeometry'

describe('getTileCount', () => {
  it('returns correct total for tilesPerSide=9', () => {
    expect(getTileCount(9)).toBe(32)
  })

  it('returns correct total for tilesPerSide=5', () => {
    expect(getTileCount(5)).toBe(16)
  })

  it('returns correct total for tilesPerSide=10', () => {
    expect(getTileCount(10)).toBe(36)
  })
})

describe('getTileCoordinates', () => {
  it('position 0 is bottom-left corner (col=0, row=8) for tilesPerSide=9', () => {
    const { col, row } = getTileCoordinates(0, 9)
    expect(col).toBe(0)
    expect(row).toBe(8)
  })

  it('position 1 is one step right on bottom row', () => {
    const { col, row } = getTileCoordinates(1, 9)
    expect(col).toBe(1)
    expect(row).toBe(8)
  })

  it('position 8 is bottom-right corner (col=8, row=8) for tilesPerSide=9', () => {
    const { col, row } = getTileCoordinates(8, 9)
    expect(col).toBe(8)
    expect(row).toBe(8)
  })

  it('position 9 is one step up on right side (col=8, row=7)', () => {
    const { col, row } = getTileCoordinates(9, 9)
    expect(col).toBe(8)
    expect(row).toBe(7)
  })

  it('position 16 is top-right corner (col=8, row=0) for tilesPerSide=9', () => {
    const { col, row } = getTileCoordinates(16, 9)
    expect(col).toBe(8)
    expect(row).toBe(0)
  })

  it('position 24 is top-left corner (col=0, row=0) for tilesPerSide=9', () => {
    const { col, row } = getTileCoordinates(24, 9)
    expect(col).toBe(0)
    expect(row).toBe(0)
  })
})

describe('wrapPosition', () => {
  it('wraps position equal to total back to 0', () => {
    expect(wrapPosition(32, 9)).toBe(0)
  })

  it('wraps position beyond total correctly', () => {
    expect(wrapPosition(33, 9)).toBe(1)
  })

  it('returns position unchanged if within bounds', () => {
    expect(wrapPosition(5, 9)).toBe(5)
  })

  it('wraps large numbers correctly', () => {
    expect(wrapPosition(64, 9)).toBe(0)
  })
})

describe('isCorner', () => {
  it('position 0 is a corner', () => {
    expect(isCorner(0, 9)).toBe(true)
  })

  it('position 8 is a corner (n=8)', () => {
    expect(isCorner(8, 9)).toBe(true)
  })

  it('position 16 is a corner', () => {
    expect(isCorner(16, 9)).toBe(true)
  })

  it('position 24 is a corner', () => {
    expect(isCorner(24, 9)).toBe(true)
  })

  it('position 5 is not a corner', () => {
    expect(isCorner(5, 9)).toBe(false)
  })
})

describe('computeMovePath', () => {
  it('returns path including from and to positions', () => {
    expect(computeMovePath(3, 6, 10)).toEqual([3, 4, 5, 6])
  })

  it('wraps around the board', () => {
    const total = getTileCount(10) // 36
    expect(computeMovePath(34, 2, 10)).toEqual([34, 35, 0, 1, 2])
  })

  it('single space move', () => {
    expect(computeMovePath(5, 6, 10)).toEqual([5, 6])
  })

  it('handles from === to (zero-length move stays put)', () => {
    expect(computeMovePath(5, 5, 10)).toEqual([5])
  })
})
