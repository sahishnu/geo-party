import { useEffect, useRef, useState } from 'react'
import type { GameEvent, Team, GameConfig } from '../types/database'
import { computeMovePath } from '../utils/boardGeometry'

interface AnimState {
  team: Team
  path: number[]
  step: number
}

interface MoveAnimationResult {
  animatingTeam: Team | null
  currentPosition: number | null
  isAnimating: boolean
}

export function useMoveAnimation(
  events: GameEvent[],
  teams: Team[],
  config: GameConfig | null
): MoveAnimationResult {
  const [animState, setAnimState] = useState<AnimState | null>(null)
  const prevEventsRef = useRef<GameEvent[]>([])

  // Detect new move events
  useEffect(() => {
    const prev = prevEventsRef.current
    const newEvent = events.find(
      e => e.event_type === 'move' && !prev.some(p => p.id === e.id)
    )
    if (
      newEvent &&
      newEvent.from_position != null &&
      newEvent.to_position != null &&
      config
    ) {
      const team = teams.find(t => t.id === newEvent.team_id)
      if (team) {
        const path = computeMovePath(
          newEvent.from_position,
          newEvent.to_position,
          config.tiles_per_side
        )
        setAnimState({ team, path, step: 0 })
      }
    }
    prevEventsRef.current = events
  }, [events, teams, config])

  // Step timer
  useEffect(() => {
    if (!animState) return
    const isLastStep = animState.step >= animState.path.length - 1
    const msPerStep = isLastStep
      ? 1200 // hold at destination before zoom-out
      : Math.max(250, Math.min(450, 1800 / animState.path.length))

    const t = setTimeout(() => {
      if (isLastStep) {
        setAnimState(null)
      } else {
        setAnimState(s => s ? { ...s, step: s.step + 1 } : null)
      }
    }, msPerStep)

    return () => clearTimeout(t)
  }, [animState])

  return {
    animatingTeam: animState?.team ?? null,
    currentPosition: animState ? animState.path[animState.step] : null,
    isAnimating: animState !== null,
  }
}
