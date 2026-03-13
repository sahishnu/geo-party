import type { TileType } from '../types/database'

export interface TileColors {
  bg: string
  text: string
  border: string
  label: string
  stripeColor: string
  noStripe?: boolean
}

const COLOR_MAP: Record<TileType, TileColors> = {
  solo: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-400', label: 'Solo', stripeColor: '#2563EB' },
  head_to_head: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-400', label: 'Head to Head', stripeColor: '#DC2626' },
  all_teams: { bg: 'bg-green-600', text: 'text-white', border: 'border-green-400', label: 'All Teams', stripeColor: '#16A34A' },
  misc: { bg: 'bg-yellow-500', text: 'text-black', border: 'border-yellow-300', label: 'Misc', stripeColor: '#CA8A04' },
  start: { bg: 'bg-gray-700', text: 'text-white', border: 'border-gray-500', label: 'Start', stripeColor: '#374151' },
  jail: { bg: 'bg-orange-700', text: 'text-white', border: 'border-orange-500', label: 'Jail', stripeColor: '#C2410C' },
  go_to_jail: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-300', label: 'Go to Jail', stripeColor: '#EA580C', noStripe: true },
  pot: { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-400', label: 'Pot', stripeColor: '#7C3AED' },
  pay_taxes: { bg: 'bg-pink-700', text: 'text-white', border: 'border-pink-500', label: 'Pay Taxes', stripeColor: '#BE185D', noStripe: true },
  chance: { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-400', label: 'Chance', stripeColor: '#4338CA', noStripe: true },
  random: { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-400', label: 'Random', stripeColor: '#0F766E' },
}

export function getTileColors(tileType: TileType): TileColors {
  return COLOR_MAP[tileType] ?? COLOR_MAP.misc
}
