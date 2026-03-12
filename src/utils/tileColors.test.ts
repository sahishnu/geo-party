import { describe, it, expect } from 'vitest'
import { getTileColors } from './tileColors'

describe('getTileColors', () => {
  it('returns blue bg for solo tiles', () => {
    const { bg } = getTileColors('solo')
    expect(bg).toContain('blue')
  })

  it('returns red bg for head_to_head tiles', () => {
    const { bg } = getTileColors('head_to_head')
    expect(bg).toContain('red')
  })

  it('returns green bg for all_teams tiles', () => {
    const { bg } = getTileColors('all_teams')
    expect(bg).toContain('green')
  })

  it('returns yellow bg for misc tiles', () => {
    const { bg } = getTileColors('misc')
    expect(bg).toContain('yellow')
  })

  it('returns a defined color for all tile types', () => {
    const types = ['solo', 'head_to_head', 'all_teams', 'misc', 'start', 'jail', 'pot', 'pay_taxes', 'chance', 'random'] as const
    for (const type of types) {
      const colors = getTileColors(type)
      expect(colors.bg).toBeTruthy()
      expect(colors.text).toBeTruthy()
      expect(colors.border).toBeTruthy()
      expect(colors.label).toBeTruthy()
    }
  })

  it('returns a human-readable label for each type', () => {
    expect(getTileColors('head_to_head').label).toBe('Head to Head')
    expect(getTileColors('all_teams').label).toBe('All Teams')
    expect(getTileColors('pay_taxes').label).toBe('Pay Taxes')
  })

  it('falls back to misc colors for unknown type', () => {
    // @ts-expect-error - testing unknown type fallback
    const colors = getTileColors('unknown_type')
    expect(colors.bg).toContain('yellow')
  })
})
