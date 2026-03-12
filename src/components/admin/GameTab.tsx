import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Team, Tile, GameConfig } from '../../types/database'
import { wrapPosition } from '../../utils/boardGeometry'

interface Props {
  teams: Team[]
  tiles: Tile[]
  config: GameConfig
}

export default function GameTab({ teams, tiles, config }: Props) {
  const [moveInputs, setMoveInputs] = useState<Record<string, string>>({})
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({})
  const [scoreNotes, setScoreNotes] = useState<Record<string, string>>({})

  const tileMap = new Map(tiles.map(t => [t.position, t]))

  const moveTeam = async (team: Team) => {
    const spaces = parseInt(moveInputs[team.id] ?? '0')
    if (!spaces || spaces < 1) return

    const newPosition = wrapPosition(team.position + spaces, config.tiles_per_side)
    const landedTile = tileMap.get(newPosition)

    await supabase.from('teams').update({ position: newPosition }).eq('id', team.id)

    await supabase.from('events').insert({
      event_type: 'move',
      team_id: team.id,
      spaces_moved: spaces,
      from_position: team.position,
      to_position: newPosition,
      tile_label: landedTile?.label ?? 'Unknown',
    })

    if (landedTile) {
      await handleSpecialTile(team, landedTile)
    }

    setMoveInputs(prev => ({ ...prev, [team.id]: '' }))
  }

  const handleSpecialTile = async (team: Team, tile: Tile) => {
    if (tile.tile_type === 'jail') {
      await applyPenaltyToPot(team, config.jail_penalty, 'Jail penalty')
    } else if (tile.tile_type === 'pay_taxes') {
      await applyPenaltyToPot(team, config.tax_penalty, 'Tax penalty')
    } else if (tile.tile_type === 'pot') {
      const potAmount = config.pot_total
      if (potAmount > 0) {
        await supabase.from('teams').update({ score: team.score + potAmount }).eq('id', team.id)
        await supabase.from('game_config').update({ pot_total: 0 }).eq('id', config.id)
        await supabase.from('events').insert({
          event_type: 'pot_claim',
          team_id: team.id,
          points_delta: potAmount,
          notes: `Claimed pot of ${potAmount} points`,
        })
      }
    }
  }

  const applyPenaltyToPot = async (team: Team, amount: number, reason: string) => {
    await supabase.from('teams').update({ score: team.score - amount }).eq('id', team.id)
    await supabase.from('game_config').update({ pot_total: config.pot_total + amount }).eq('id', config.id)
    await supabase.from('events').insert({
      event_type: 'pot_contribution',
      team_id: team.id,
      points_delta: -amount,
      notes: reason,
    })
  }

  const adjustScore = async (team: Team, delta: number) => {
    if (!delta) return
    const notes = scoreNotes[team.id]?.trim() || null
    await supabase.from('teams').update({ score: team.score + delta }).eq('id', team.id)
    await supabase.from('events').insert({
      event_type: 'score_change',
      team_id: team.id,
      points_delta: delta,
      notes,
    })
    setScoreInputs(prev => ({ ...prev, [team.id]: '' }))
    setScoreNotes(prev => ({ ...prev, [team.id]: '' }))
  }

  const addManualPenaltyToPot = async (team: Team) => {
    const amount = parseInt(scoreInputs[team.id] ?? '0')
    if (!amount || amount <= 0) return
    const notes = scoreNotes[team.id]?.trim() || 'Manual penalty'
    await applyPenaltyToPot(team, amount, notes)
    setScoreInputs(prev => ({ ...prev, [team.id]: '' }))
    setScoreNotes(prev => ({ ...prev, [team.id]: '' }))
  }

  const setCurrentTurn = async (teamId: string) => {
    await supabase.from('game_config').update({ current_team_id: teamId }).eq('id', config.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Game Controls</h2>
        <div className="bg-purple-900 border border-purple-500 rounded-lg px-4 py-2">
          <span className="text-sm text-purple-300">Pot Total:</span>
          <span className="text-2xl font-bold text-purple-200 ml-2">{config.pot_total}</span>
        </div>
      </div>

      {teams.length === 0 && (
        <p className="text-gray-500 italic text-sm">No teams yet. Add teams in the Teams tab.</p>
      )}

      <div className="space-y-3">
        {teams.map(team => {
          const currentTile = tileMap.get(team.position)
          const isCurrentTurn = team.id === config.current_team_id
          return (
            <div key={team.id}
              className={`bg-gray-800 rounded-xl p-4 border-2 ${isCurrentTurn ? 'border-yellow-400' : 'border-gray-600'}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{team.icon}</span>
                <div className="flex-1">
                  <div className="font-bold">{team.name}</div>
                  <div className="text-sm text-gray-400">
                    {team.score} pts · Tile {team.position}{currentTile ? `: ${currentTile.label}` : ''}
                  </div>
                </div>
                <button onClick={() => setCurrentTurn(team.id)}
                  className={`text-xs px-2 py-1 rounded border ${isCurrentTurn
                    ? 'bg-yellow-500 text-black border-yellow-400'
                    : 'border-gray-500 text-gray-400 hover:border-yellow-400 hover:text-yellow-400'
                  }`}>
                  {isCurrentTurn ? 'Current Turn' : 'Set Turn'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Dice Roll → Move</label>
                  <div className="flex gap-2">
                    <input type="number" min={1} max={12}
                      value={moveInputs[team.id] ?? ''}
                      onChange={e => setMoveInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                      placeholder="Spaces"
                      className="flex-1 bg-gray-700 text-white px-2 py-1.5 rounded text-sm" />
                    <button onClick={() => moveTeam(team)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-semibold">
                      Move
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Adjust Score</label>
                  <div className="flex gap-2">
                    <input type="number"
                      value={scoreInputs[team.id] ?? ''}
                      onChange={e => setScoreInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                      placeholder="Points"
                      className="flex-1 bg-gray-700 text-white px-2 py-1.5 rounded text-sm" />
                    <button
                      onClick={() => adjustScore(team, parseInt(scoreInputs[team.id] ?? '0'))}
                      className="bg-green-600 hover:bg-green-500 text-white px-2 py-1.5 rounded text-sm">+</button>
                    <button
                      onClick={() => adjustScore(team, -Math.abs(parseInt(scoreInputs[team.id] ?? '0')))}
                      className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded text-sm">−</button>
                    <button onClick={() => addManualPenaltyToPot(team)}
                      className="bg-purple-700 hover:bg-purple-600 text-white px-2 py-1.5 rounded text-xs">→Pot</button>
                  </div>
                  <input
                    value={scoreNotes[team.id] ?? ''}
                    onChange={e => setScoreNotes(prev => ({ ...prev, [team.id]: e.target.value }))}
                    placeholder="Notes (optional)"
                    className="mt-1 w-full bg-gray-700 text-white px-2 py-1 rounded text-xs" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
