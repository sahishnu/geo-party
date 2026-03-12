import { describe, it, expect } from 'vitest'
import type { Team, Tile, GameConfig, GameEvent, Card } from './database'

describe('database types', () => {
  it('Team type has required fields', () => {
    const team: Team = {
      id: '1', name: 'Team A', icon: '🎮',
      score: 0, position: 0, turn_order: 0, laps: 0, created_at: ''
    }
    expect(team.name).toBe('Team A')
  })

  it('Tile type has required fields', () => {
    const tile: Tile = {
      id: '1', position: 0, label: 'Start',
      image_url: null, tile_type: 'start', color_group: 'gray'
    }
    expect(tile.tile_type).toBe('start')
  })

  it('GameConfig type has required fields', () => {
    const config: GameConfig = {
      id: '1', game_name: 'Geo Party', game_description: '', tiles_per_side: 9,
      jail_penalty: 50, tax_penalty: 30, pot_total: 0, current_team_id: null
    }
    expect(config.pot_total).toBe(0)
  })

  it('GameEvent type has required fields', () => {
    const event: GameEvent = {
      id: '1', created_at: '', event_type: 'move', team_id: null,
      spaces_moved: null, from_position: null, to_position: null,
      tile_label: null, points_delta: null, notes: null
    }
    expect(event.event_type).toBe('move')
  })

  it('Card type has required fields', () => {
    const card: Card = {
      id: '1', deck_type: 'chance', content: 'Go back 3 spaces', created_at: ''
    }
    expect(card.deck_type).toBe('chance')
  })
})
