export type TileType =
  | 'solo' | 'head_to_head' | 'all_teams' | 'misc'
  | 'start' | 'jail' | 'pot' | 'pay_taxes' | 'chance' | 'random'

export type EventType =
  | 'move' | 'score_change' | 'pot_contribution' | 'pot_claim' | 'card_reveal'

export type DeckType = 'chance' | 'random'

export interface GameConfig {
  id: string
  game_name: string
  tiles_per_side: number
  jail_penalty: number
  tax_penalty: number
  pot_total: number
  current_team_id: string | null
}

export interface Team {
  id: string
  name: string
  icon: string
  score: number
  position: number
  turn_order: number
  created_at: string
}

export interface Tile {
  id: string
  position: number
  label: string
  image_url: string | null
  tile_type: TileType
  color_group: string
}

export interface GameEvent {
  id: string
  created_at: string
  event_type: EventType
  team_id: string | null
  spaces_moved: number | null
  from_position: number | null
  to_position: number | null
  tile_label: string | null
  points_delta: number | null
  notes: string | null
}

export interface Card {
  id: string
  deck_type: DeckType
  content: string
  created_at: string
}
