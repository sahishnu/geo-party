import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Tile, GameConfig } from '../../types/database'
import { getTileColors } from '../../utils/tileColors'
import { generateDefaultTiles } from '../../utils/seedTiles'
import TileEditor from './TileEditor'

interface Props {
  tiles: Tile[]
  config: GameConfig
}

export default function BoardTab({ tiles, config }: Props) {
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null)
  const [tilesPerSide, setTilesPerSide] = useState(config.tiles_per_side)
  const [resizing, setResizing] = useState(false)

  const resizeBoard = async () => {
    setResizing(true)
    // Delete all existing tiles then insert new ones
    await supabase.from('tiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const newTiles = generateDefaultTiles(tilesPerSide)
    await supabase.from('tiles').insert(newTiles)
    await supabase.from('game_config').update({ tiles_per_side: tilesPerSide }).eq('id', config.id)
    setResizing(false)
  }

  const sortedTiles = [...tiles].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Board Configuration</h2>

      <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 flex items-center gap-4 flex-wrap">
        <label className="text-sm text-gray-400">Tiles per side:</label>
        <input
          type="number" min={5} max={15} value={tilesPerSide}
          onChange={e => setTilesPerSide(Number(e.target.value))}
          className="w-20 bg-gray-700 text-white px-2 py-1 rounded text-center"
        />
        <button onClick={resizeBoard} disabled={resizing}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold text-sm">
          {resizing ? 'Resizing...' : 'Resize Board'}
        </button>
        <span className="text-xs text-gray-500">⚠️ This resets all tile content</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {sortedTiles.map(tile => {
          const colors = getTileColors(tile.tile_type)
          return (
            <button key={tile.id} onClick={() => setSelectedTile(tile)}
              className={`${colors.bg} ${colors.text} p-2 rounded text-left text-xs border-2 ${colors.border} hover:opacity-90`}>
              <div className="font-bold">#{tile.position}</div>
              <div className="truncate">{tile.label}</div>
              <div className="text-[10px] opacity-75">{getTileColors(tile.tile_type).label}</div>
            </button>
          )
        })}
      </div>

      {tiles.length === 0 && (
        <p className="text-gray-500 italic text-sm">No tiles yet. Set tiles per side and click Resize Board.</p>
      )}

      {selectedTile && (
        <TileEditor tile={selectedTile} onClose={() => setSelectedTile(null)} />
      )}
    </div>
  )
}
