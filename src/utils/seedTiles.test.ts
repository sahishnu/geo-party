import { describe, it, expect } from 'vitest'
import { generateDefaultTiles } from './seedTiles'

describe('generateDefaultTiles', () => {
  it('generates correct number of tiles for tilesPerSide=9', () => {
    const tiles = generateDefaultTiles(9)
    expect(tiles.length).toBe(32)
  })

  it('generates correct number of tiles for tilesPerSide=5', () => {
    const tiles = generateDefaultTiles(5)
    expect(tiles.length).toBe(16)
  })

  it('assigns sequential positions starting at 0', () => {
    const tiles = generateDefaultTiles(9)
    tiles.forEach((tile, i) => expect(tile.position).toBe(i))
  })

  it('sets position 0 as start tile', () => {
    const tiles = generateDefaultTiles(9)
    expect(tiles[0].tile_type).toBe('start')
    expect(tiles[0].label).toBe('Start')
  })

  it('sets corner at n as jail tile', () => {
    const tiles = generateDefaultTiles(9) // n=8
    expect(tiles[8].tile_type).toBe('jail')
    expect(tiles[8].label).toBe('Jail')
  })

  it('sets corner at 2n as pot tile', () => {
    const tiles = generateDefaultTiles(9) // 2n=16
    expect(tiles[16].tile_type).toBe('pot')
    expect(tiles[16].label).toBe('Pot')
  })

  it('sets corner at 3n as pay_taxes tile', () => {
    const tiles = generateDefaultTiles(9) // 3n=24
    expect(tiles[24].tile_type).toBe('pay_taxes')
    expect(tiles[24].label).toBe('Pay Taxes')
  })

  it('all tiles have image_url set to null', () => {
    const tiles = generateDefaultTiles(9)
    expect(tiles.every(t => t.image_url === null)).toBe(true)
  })

  it('non-special tiles have an activity type', () => {
    const activityTypes = ['solo', 'head_to_head', 'all_teams', 'misc', 'chance', 'random']
    const tiles = generateDefaultTiles(9)
    const nonSpecial = tiles.filter(
      t => !['start', 'jail', 'pot', 'pay_taxes'].includes(t.tile_type)
    )
    nonSpecial.forEach(tile => {
      expect(activityTypes).toContain(tile.tile_type)
    })
  })
})
