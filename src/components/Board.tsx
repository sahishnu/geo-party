import { motion } from 'framer-motion'
import type { Tile, Team, GameConfig } from '../types/database'
import { getTileCoordinates, getTileCount, getTileSide } from '../utils/boardGeometry'
import TileCell from './TileCell'
import TeamToken from './TeamToken'

interface Props {
  tiles: Tile[]
  teams: Team[]
  config: GameConfig
  animatingTeamId?: string
  animatingTeam?: Team
  animationPosition?: number | null
}

export default function Board({ tiles, teams, config, animatingTeamId, animatingTeam, animationPosition }: Props) {
  const n = config.tiles_per_side
  const totalTiles = getTileCount(n)

  const tileMap = new Map(tiles.map(t => [t.position, t]))

  const teamsByPosition = new Map<number, Team[]>()
  for (const team of teams) {
    const list = teamsByPosition.get(team.position) ?? []
    list.push(team)
    teamsByPosition.set(team.position, list)
  }

  const currentTeam = teams.find(t => t.id === config.current_team_id)

  const tileSize = Math.min(
    Math.floor((window.innerWidth * 0.95) / n),
    Math.floor((window.innerHeight * 0.72) / n),
    120
  )

  const boardPx = n * tileSize
  const centerOffset = tileSize
  const centerSize = (n - 2) * tileSize

  return (
    // Outermost frame — second border
    <div
      style={{
        display: 'inline-block',
        border: '15px solid #D4E5BC',
        borderRadius: 7,
        padding: 4,
        boxShadow: [
          '0 28px 72px rgba(0,0,0,0.45)',
          '0 8px 24px rgba(0,0,0,0.25)',
        ].join(', '),
        background: '#1a1a2a',
      }}
    >
      {/* Inner board frame — black border */}
      <div
        style={{
          display: 'inline-block',
          border: '5px solid #1a1a2a',
          borderRadius: 4,
          boxShadow: 'inset 0 0 0 6px #d4c9a8',
        background: '#d4c9a8',
      }}
    >
      {/* Tile grid */}
      <div
        className="relative"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${n}, ${tileSize}px)`,
          gridTemplateRows: `repeat(${n}, ${tileSize}px)`,
          width: boardPx,
          height: boardPx,
        }}
      >
        {Array.from({ length: totalTiles }, (_, i) => {
          const tile = tileMap.get(i)
          if (!tile) return null

          const teamsHere = (teamsByPosition.get(i) ?? []).filter(t => t.id !== animatingTeamId)
          const { col, row } = getTileCoordinates(i, n)
          const isCurrent = currentTeam ? teamsHere.some(t => t.id === currentTeam.id) : false
          const side = getTileSide(i, n)

          return (
            <TileCell
              key={i}
              tile={tile}
              teams={teamsHere}
              isCurrent={isCurrent}
              side={side}
              tileSize={tileSize}
              style={{
                gridColumn: col + 1,
                gridRow: row + 1,
                width: tileSize,
                height: tileSize,
              }}
            />
          )
        })}

        {/* ── Overlay avatar — hops tile-to-tile during move animation ── */}
        {animatingTeam && animationPosition != null && (() => {
          const { col, row } = getTileCoordinates(animationPosition, n)
          const left = col * tileSize + tileSize / 2
          const top = row * tileSize + tileSize / 2
          return (
            <motion.div
              key={animatingTeam.id}
              animate={{ left, top }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={{ position: 'absolute', zIndex: 50, pointerEvents: 'none' }}
            >
              <div style={{ transform: 'translate(-50%, -50%)', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>
                <TeamToken team={animatingTeam} size="lg" />
              </div>
            </motion.div>
          )
        })()}

        {/* ── Board Center ──────────────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: centerOffset,
            left: centerOffset,
            width: centerSize,
            height: centerSize,
            background: 'linear-gradient(145deg, #eef7ee 0%, #ddf0dd 50%, #e8f4e8 100%)',
            border: '2px solid #1a1a2a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            userSelect: 'none',
          }}
        >
          {/* Inner decorative border */}
          <div
            style={{
              position: 'absolute',
              inset: 8,
                border: '2px solid rgba(26,26,42,0.2)',
              pointerEvents: 'none',
            }}
          />

          {/* Diagonal corner accents */}
          {[
            { top: 0, left: 0, transform: 'none' },
            { top: 0, right: 0, transform: 'scaleX(-1)' },
            { bottom: 0, left: 0, transform: 'scaleY(-1)' },
            { bottom: 0, right: 0, transform: 'scale(-1)' },
          ].map((pos, i) => (
            <svg
              key={i}
              width={centerSize * 0.12}
              height={centerSize * 0.12}
              viewBox="0 0 40 40"
              style={{ position: 'absolute', opacity: 1, ...pos }}
            >
              <path d="M0 0 L40 0 L0 40 Z" fill="#1F2937" />
            </svg>
          ))}

          {/* Content */}
          <div style={{ position: 'relative', textAlign: 'center', padding: '8px 16px' }}>
            {/* Globe */}
            <div style={{ fontSize: centerSize * 0.14, lineHeight: 1, marginBottom: centerSize * 0.02 }}>
                🌎
            </div>

            {/* Game name */}
            <div
              style={{
                fontFamily: '"Nunito", sans-serif',
                fontWeight: 900,
                fontSize: centerSize * 0.115,
                color: '#1a3a1a',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
                JeoParty
            </div>

            {/* Rule */}
            <div
              style={{
                width: '60%',
                height: 2,
                background: 'linear-gradient(90deg, transparent, #2d6a2d, transparent)',
                margin: `${centerSize * 0.025}px auto`,
              }}
            />

            {/* Subtitle */}
            <div
              style={{
                fontFamily: '"Nunito", sans-serif',
                fontWeight: 700,
                fontSize: centerSize * 0.048,
                color: '#3d6b3d',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
                We Are One
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
