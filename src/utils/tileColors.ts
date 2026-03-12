import type { TileType } from '../types/database'

export interface TileColors {
  bg: string
  text: string
  border: string
  label: string
}

const COLOR_MAP: Record<TileType, TileColors> = {
  solo:         { bg: 'bg-blue-600',   text: 'text-white', border: 'border-blue-400',   label: 'Solo' },
  head_to_head: { bg: 'bg-red-600',    text: 'text-white', border: 'border-red-400',    label: 'Head to Head' },
  all_teams:    { bg: 'bg-green-600',  text: 'text-white', border: 'border-green-400',  label: 'All Teams' },
  misc:         { bg: 'bg-yellow-500', text: 'text-black', border: 'border-yellow-300', label: 'Misc' },
  start:        { bg: 'bg-gray-700',   text: 'text-white', border: 'border-gray-500',   label: 'Start' },
  jail:         { bg: 'bg-orange-700', text: 'text-white', border: 'border-orange-500', label: 'Jail' },
  pot:          { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-400', label: 'Pot' },
  pay_taxes:    { bg: 'bg-pink-700',   text: 'text-white', border: 'border-pink-500',   label: 'Pay Taxes' },
  chance:       { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-400', label: 'Chance' },
  random:       { bg: 'bg-teal-600',   text: 'text-white', border: 'border-teal-400',   label: 'Random' },
}

export function getTileColors(tileType: TileType): TileColors {
  return COLOR_MAP[tileType] ?? COLOR_MAP.misc
}
