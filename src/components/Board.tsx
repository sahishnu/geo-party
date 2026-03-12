import type { Tile, Team, GameConfig } from '../types/database'
import { getTileCoordinates, getTileCount, getTileSide } from '../utils/boardGeometry'
import TileCell from './TileCell'

interface Props {
  tiles: Tile[]
  teams: Team[]
  config: GameConfig
}

export default function Board({ tiles, teams, config }: Props) {
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
    // Outer board frame — double border + shadow
    <div
      style={{
        display: 'inline-block',
        border: '3px solid #1a1a2a',
        borderRadius: 4,
        boxShadow: [
          '0 28px 72px rgba(0,0,0,0.45)',
          '0 8px 24px rgba(0,0,0,0.25)',
          'inset 0 0 0 6px #d4c9a8',
        ].join(', '),
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

          const teamsHere = teamsByPosition.get(i) ?? []
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
              border: '1.5px solid rgba(26,26,42,0.2)',
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
              style={{ position: 'absolute', opacity: 0.25, ...pos }}
            >
              <path d="M0 0 L40 0 L0 40 Z" fill="#1a1a2a" />
            </svg>
          ))}

          {/* Content */}
          <div style={{ position: 'relative', textAlign: 'center', padding: '8px 16px' }}>
            {/* Globe */}
            <div style={{ fontSize: centerSize * 0.14, lineHeight: 1, marginBottom: centerSize * 0.02 }}>
              🌍
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
              Geo Party
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
              Geography · Trivia · Strategy
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
