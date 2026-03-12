import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Tile, TileType } from '../../types/database'
import { getTileColors } from '../../utils/tileColors'

const TILE_TYPES: TileType[] = [
  'solo', 'head_to_head', 'all_teams', 'misc',
  'start', 'jail', 'pot', 'pay_taxes', 'chance', 'random'
]

export default function TileEditor({ tile, onClose }: { tile: Tile; onClose: () => void }) {
  const [label, setLabel] = useState(tile.label)
  const [tileType, setTileType] = useState<TileType>(tile.tile_type)
  const [imageUrl, setImageUrl] = useState(tile.image_url ?? '')

  const save = async () => {
    await supabase
      .from('tiles')
      .update({ label, tile_type: tileType, color_group: tileType, image_url: imageUrl || null })
      .eq('id', tile.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-600">
        <h3 className="text-lg font-bold">Edit Tile #{tile.position}</h3>

        <div>
          <label className="text-sm text-gray-400 block mb-1">Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded" />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">Type</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {TILE_TYPES.map(type => {
              const colors = getTileColors(type)
              return (
                <button key={type} onClick={() => setTileType(type)}
                  className={`${colors.bg} ${colors.text} px-3 py-2 rounded text-sm font-semibold border-2 ${
                    tileType === type ? 'border-white' : 'border-transparent'
                  }`}>
                  {colors.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">Image URL (optional)</label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-gray-700 text-white px-3 py-2 rounded" />
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="text-gray-400 hover:text-white px-4 py-2">Cancel</button>
          <button onClick={save}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-semibold">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
