import { getTileCount } from './boardGeometry'
import type { TileType } from '../types/database'

interface TileSeed {
  position: number
  label: string
  tile_type: TileType
  color_group: string
  image_url: null
}

const ACTIVITY_TYPES: TileType[] = ['solo', 'head_to_head', 'all_teams', 'misc']

export function generateDefaultTiles(tilesPerSide: number): TileSeed[] {
  const total = getTileCount(tilesPerSide)
  const n = tilesPerSide - 1

  return Array.from({ length: total }, (_, i) => {
    // Four corners
    if (i === 0)       return { position: i, label: 'Start',     tile_type: 'start',     color_group: 'gray',   image_url: null }
    if (i === n)       return { position: i, label: 'Jail',      tile_type: 'jail',      color_group: 'orange', image_url: null }
    if (i === 2 * n)   return { position: i, label: 'Pot',       tile_type: 'pot',       color_group: 'purple', image_url: null }
    if (i === 3 * n)   return { position: i, label: 'Pay Taxes', tile_type: 'pay_taxes', color_group: 'pink',   image_url: null }

    // Chance tiles at quarter-points of each side (avoiding corners)
    if (i === Math.floor(n / 2))       return { position: i, label: 'Chance', tile_type: 'chance', color_group: 'indigo', image_url: null }
    if (i === Math.floor(3 * n / 2))   return { position: i, label: 'Chance', tile_type: 'chance', color_group: 'indigo', image_url: null }

    // Random tiles at the other quarter-points
    if (i === Math.floor(5 * n / 2))   return { position: i, label: 'Random', tile_type: 'random', color_group: 'teal', image_url: null }
    if (i === Math.floor(7 * n / 2))   return { position: i, label: 'Random', tile_type: 'random', color_group: 'teal', image_url: null }

    // Activity tiles cycle through types
    const type = ACTIVITY_TYPES[i % ACTIVITY_TYPES.length]
    return { position: i, label: 'Activity', tile_type: type, color_group: type, image_url: null }
  })
}
