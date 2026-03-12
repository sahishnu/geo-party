import type { Tile, Team, GameConfig } from '../types/database'
import { getTileCoordinates, getTileCount } from '../utils/boardGeometry'
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

  // Calculate tile size to fit board in the available space
  const tileSize = Math.min(
    Math.floor((window.innerWidth * 0.95) / n),
    Math.floor((window.innerHeight * 0.72) / n),
    120
  )

  return (
    <div
      className="relative mx-auto"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${n}, ${tileSize}px)`,
        gridTemplateRows: `repeat(${n}, ${tileSize}px)`,
        width: `${n * tileSize}px`,
        height: `${n * tileSize}px`,
      }}
    >
      {Array.from({ length: totalTiles }, (_, i) => {
        const tile = tileMap.get(i)
        if (!tile) return null

        const teamsHere = teamsByPosition.get(i) ?? []
        const { col, row } = getTileCoordinates(i, n)
        const isCurrent = currentTeam ? teamsHere.some(t => t.id === currentTeam.id) : false

        return (
          <TileCell
            key={i}
            tile={tile}
            teams={teamsHere}
            isCurrent={isCurrent}
            style={{
              gridColumn: col + 1,
              gridRow: row + 1,
              width: tileSize,
              height: tileSize,
            }}
          />
        )
      })}
    </div>
  )
}
