import type { Tile, Team } from '../types/database'
import { getTileColors } from '../utils/tileColors'
import TeamToken from './TeamToken'

interface Props {
  tile: Tile
  teams: Team[]
  isCurrent?: boolean
  style?: React.CSSProperties
}

export default function TileCell({ tile, teams, isCurrent, style }: Props) {
  const colors = getTileColors(tile.tile_type)

  return (
    <div
      className={`
        ${colors.bg} ${colors.text} ${colors.border}
        border-2 rounded flex flex-col items-center justify-between
        p-1 overflow-hidden relative
        ${isCurrent ? 'ring-2 ring-white ring-offset-1' : ''}
      `}
      style={style}
    >
      {tile.image_url && (
        <img
          src={tile.image_url}
          alt={tile.label}
          className="w-full h-10 object-cover rounded mb-1"
        />
      )}
      <span className="text-center text-xs font-semibold leading-tight line-clamp-2 flex-1">
        {tile.label}
      </span>
      {teams.length > 0 && (
        <div className="flex flex-wrap gap-0.5 justify-center mt-1">
          {teams.map(team => (
            <TeamToken key={team.id} team={team} size="sm" />
          ))}
        </div>
      )}
    </div>
  )
}
