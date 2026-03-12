import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { GameConfig, TileType, DeckType, GameMode } from '../../types/database'

interface GameSeed {
  settings?: {
    game_name?: string
    game_description?: string
    tiles_per_side?: number
    jail_penalty?: number
    tax_penalty?: number
  }
  teams?: {
    name: string
    icon: string
  }[]
  tiles?: {
    position: number
    label: string
    tile_type: TileType
    color_group?: string
    image_url?: string | null
  }[]
  cards?: {
    deck_type: DeckType
    content: string
  }[]
  activities?: {
    title: string
    game_mode: GameMode
  }[]
}

const VALID_TILE_TYPES: TileType[] = [
  'solo', 'head_to_head', 'all_teams', 'misc',
  'start', 'jail', 'pot', 'pay_taxes', 'chance', 'random',
]
const VALID_DECK_TYPES: DeckType[] = ['chance', 'random']
const VALID_GAME_MODES: GameMode[] = ['solo', 'head_to_head', 'all_teams', 'team_relay']

function validateSeed(data: unknown): { valid: true; seed: GameSeed } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'JSON must be an object' }
  const seed = data as GameSeed

  if (seed.teams && !Array.isArray(seed.teams)) return { valid: false, error: '"teams" must be an array' }
  if (seed.teams?.some(t => !t.name || !t.icon))
    return { valid: false, error: 'Each team must have "name" and "icon"' }

  if (seed.tiles && !Array.isArray(seed.tiles)) return { valid: false, error: '"tiles" must be an array' }
  if (seed.tiles?.some(t => typeof t.position !== 'number' || !t.label || !t.tile_type))
    return { valid: false, error: 'Each tile must have "position", "label", and "tile_type"' }
  if (seed.tiles?.some(t => !VALID_TILE_TYPES.includes(t.tile_type)))
    return { valid: false, error: `Invalid tile_type. Must be one of: ${VALID_TILE_TYPES.join(', ')}` }

  if (seed.cards && !Array.isArray(seed.cards)) return { valid: false, error: '"cards" must be an array' }
  if (seed.cards?.some(c => !c.content || !c.deck_type))
    return { valid: false, error: 'Each card must have "deck_type" and "content"' }
  if (seed.cards?.some(c => !VALID_DECK_TYPES.includes(c.deck_type)))
    return { valid: false, error: `Invalid deck_type. Must be one of: ${VALID_DECK_TYPES.join(', ')}` }

  if (seed.activities && !Array.isArray(seed.activities)) return { valid: false, error: '"activities" must be an array' }
  if (seed.activities?.some(a => !a.title || !a.game_mode))
    return { valid: false, error: 'Each activity must have "title" and "game_mode"' }
  if (seed.activities?.some(a => !VALID_GAME_MODES.includes(a.game_mode)))
    return { valid: false, error: `Invalid game_mode. Must be one of: ${VALID_GAME_MODES.join(', ')}` }

  return { valid: true, seed }
}

async function importSeed(seed: GameSeed, configId: string) {
  // Delete existing data (order matters for FK constraints)
  await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('game_config').update({ current_team_id: null }).eq('id', configId)
  await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('tiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Update game config settings
  if (seed.settings) {
    const update: Record<string, unknown> = {}
    if (seed.settings.game_name !== undefined) update.game_name = seed.settings.game_name
    if (seed.settings.game_description !== undefined) update.game_description = seed.settings.game_description
    if (seed.settings.tiles_per_side !== undefined) update.tiles_per_side = seed.settings.tiles_per_side
    if (seed.settings.jail_penalty !== undefined) update.jail_penalty = seed.settings.jail_penalty
    if (seed.settings.tax_penalty !== undefined) update.tax_penalty = seed.settings.tax_penalty
    update.pot_total = 0
    if (Object.keys(update).length) {
      await supabase.from('game_config').update(update).eq('id', configId)
    }
  }

  // Insert teams
  if (seed.teams?.length) {
    await supabase.from('teams').insert(
      seed.teams.map((t, i) => ({ name: t.name, icon: t.icon, turn_order: i, score: 0, position: 0 }))
    )
  }

  // Insert tiles
  if (seed.tiles?.length) {
    await supabase.from('tiles').insert(
      seed.tiles.map(t => ({
        position: t.position,
        label: t.label,
        tile_type: t.tile_type,
        color_group: t.color_group ?? t.tile_type,
        image_url: t.image_url ?? null,
      }))
    )
  }

  // Insert cards
  if (seed.cards?.length) {
    await supabase.from('cards').insert(seed.cards)
  }

  // Insert activities
  if (seed.activities?.length) {
    await supabase.from('activities').insert(seed.activities)
  }
}

const EXAMPLE_SEED: GameSeed = {
  settings: {
    game_name: 'My Game',
    game_description: 'Adventure Awaits',
    tiles_per_side: 9,
    jail_penalty: 50,
    tax_penalty: 30,
  },
  teams: [
    { name: 'Foxes', icon: '🦊' },
    { name: 'Dragons', icon: '🐲' },
  ],
  tiles: [
    { position: 0, label: 'Start', tile_type: 'start', color_group: 'gray' },
    { position: 1, label: 'Trivia', tile_type: 'solo', color_group: 'solo' },
  ],
  cards: [
    { deck_type: 'chance', content: 'Move forward 3 spaces' },
  ],
  activities: [
    { title: 'Geography Quiz', game_mode: 'solo' },
  ],
}

export default function SettingsTab({ config }: { config: GameConfig }) {
  const [gameName, setGameName] = useState(config.game_name)
  const [gameDescription, setGameDescription] = useState(config.game_description)
  const [jailPenalty, setJailPenalty] = useState(config.jail_penalty)
  const [taxPenalty, setTaxPenalty] = useState(config.tax_penalty)
  const [saved, setSaved] = useState(false)

  const [seedJson, setSeedJson] = useState('')
  const [seedStatus, setSeedStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const [showExample, setShowExample] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const save = async () => {
    await supabase.from('game_config').update({
      game_name: gameName,
      game_description: gameDescription,
      jail_penalty: jailPenalty,
      tax_penalty: taxPenalty,
    }).eq('id', config.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setSeedJson(reader.result as string)
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImport = async () => {
    setSeedStatus(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(seedJson)
    } catch {
      setSeedStatus({ type: 'error', message: 'Invalid JSON syntax' })
      return
    }

    const result = validateSeed(parsed)
    if (!result.valid) {
      setSeedStatus({ type: 'error', message: result.error })
      return
    }

    if (!confirm('This will DELETE all existing game data (teams, tiles, cards, activities, and the event log) and replace it with the seed data. Continue?')) {
      return
    }

    setImporting(true)
    try {
      await importSeed(result.seed, config.id)
      setSeedStatus({ type: 'success', message: 'Game seeded successfully! All data has been replaced.' })
      setSeedJson('')
    } catch (err) {
      setSeedStatus({ type: 'error', message: `Import failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-xl font-bold">Settings</h2>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Game Name</label>
        <input value={gameName} onChange={e => setGameName(e.target.value)}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded" />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Game Description</label>
        <input value={gameDescription} onChange={e => setGameDescription(e.target.value)}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded"
          placeholder="Displayed below the game name on the board" />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Jail Penalty (points)</label>
        <input type="number" value={jailPenalty} onChange={e => setJailPenalty(Number(e.target.value))}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded" />
        <p className="text-xs text-gray-500 mt-1">Points deducted when a team lands on Jail (goes into pot)</p>
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Pay Taxes Penalty (points)</label>
        <input type="number" value={taxPenalty} onChange={e => setTaxPenalty(Number(e.target.value))}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded" />
        <p className="text-xs text-gray-500 mt-1">Points deducted when a team lands on Pay Taxes (goes into pot)</p>
      </div>

      <button onClick={save}
        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-semibold">
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>

      {/* Seed / Import Game Data */}
      <div className="border-t border-gray-700 pt-6 space-y-4">
        <h2 className="text-xl font-bold">Seed Game Data</h2>
        <p className="text-sm text-gray-400">
          Import a JSON file or paste JSON to set up the entire game at once.
          This will <strong className="text-red-400">clear all existing data</strong> (teams, tiles, cards, activities, event log) and replace it.
        </p>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-semibold"
          >
            📁 Upload JSON File
          </button>
          <button
            onClick={() => setShowExample(!showExample)}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded text-sm"
          >
            {showExample ? 'Hide Example' : '📋 Show Example'}
          </button>
        </div>

        {showExample && (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-semibold">Example JSON format</span>
              <button
                onClick={() => setSeedJson(JSON.stringify(EXAMPLE_SEED, null, 2))}
                className="text-xs text-blue-400 hover:underline"
              >
                Copy to editor ↓
              </button>
            </div>
            <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre">
              {JSON.stringify(EXAMPLE_SEED, null, 2)}
            </pre>
          </div>
        )}

        <textarea
          value={seedJson}
          onChange={e => { setSeedJson(e.target.value); setSeedStatus(null) }}
          placeholder='Paste JSON here or upload a file above...'
          rows={10}
          className="w-full bg-gray-800 text-gray-200 px-3 py-2 rounded border border-gray-600 text-sm font-mono resize-y"
        />

        {seedStatus && (
          <div className={`text-sm px-3 py-2 rounded ${
            seedStatus.type === 'error'
              ? 'bg-red-900/50 text-red-300 border border-red-700'
              : 'bg-green-900/50 text-green-300 border border-green-700'
          }`}>
            {seedStatus.type === 'error' ? '❌ ' : '✅ '}{seedStatus.message}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!seedJson.trim() || importing}
          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded font-semibold"
        >
          {importing ? 'Importing...' : '🔄 Import & Replace All Data'}
        </button>
      </div>
    </div>
  )
}
