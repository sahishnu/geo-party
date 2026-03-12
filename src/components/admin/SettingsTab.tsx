import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { GameConfig } from '../../types/database'

export default function SettingsTab({ config }: { config: GameConfig }) {
  const [gameName, setGameName] = useState(config.game_name)
  const [jailPenalty, setJailPenalty] = useState(config.jail_penalty)
  const [taxPenalty, setTaxPenalty] = useState(config.tax_penalty)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    await supabase.from('game_config').update({
      game_name: gameName,
      jail_penalty: jailPenalty,
      tax_penalty: taxPenalty,
    }).eq('id', config.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
    </div>
  )
}
