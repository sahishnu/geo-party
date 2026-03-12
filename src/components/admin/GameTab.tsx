import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Team, Tile, GameConfig } from '../../types/database'
import { wrapPosition, getTileCount } from '../../utils/boardGeometry'

interface Props {
  teams: Team[]
  tiles: Tile[]
  config: GameConfig
}

export default function GameTab({ teams, tiles, config }: Props) {
  const [moveInputs, setMoveInputs] = useState<Record<string, string>>({})
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({})
  const [scoreNotes, setScoreNotes] = useState<Record<string, string>>({})
  const [overridePanelOpen, setOverridePanelOpen] = useState<Record<string, boolean>>({})
  const [overrideScoreInputs, setOverrideScoreInputs] = useState<Record<string, string>>({})
  const [overridePositionInputs, setOverridePositionInputs] = useState<Record<string, string>>({})
  const [potAwardTeamIds, setPotAwardTeamIds] = useState<string[]>([])

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

  const togglePotAwardTeam = (teamId: string) => {
    setPotAwardTeamIds(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    )
  }

  const awardPot = async () => {
    if (potAwardTeamIds.length === 0 || config.pot_total <= 0) return
    const share = Math.floor(config.pot_total / potAwardTeamIds.length)
    const selectedTeams = teams.filter(t => potAwardTeamIds.includes(t.id))

    await Promise.all(
      selectedTeams.map(team =>
        supabase.from('teams').update({ score: team.score + share }).eq('id', team.id)
      )
    )
    await supabase.from('game_config').update({ pot_total: 0 }).eq('id', config.id)
    await Promise.all(
      selectedTeams.map(team =>
        supabase.from('events').insert({
          event_type: 'pot_claim',
          team_id: team.id,
          points_delta: share,
          notes: potAwardTeamIds.length > 1
            ? `Awarded ${share} pts (pot of ${config.pot_total} split ${potAwardTeamIds.length} ways)`
            : `Awarded pot of ${share} points`,
        })
      )
    )
    setPotAwardTeamIds([])
  }

  const setCurrentTurn = async (teamId: string) => {
    await supabase.from('game_config').update({ current_team_id: teamId }).eq('id', config.id)
  }

  const overrideScore = async (team: Team) => {
    const val = parseInt(overrideScoreInputs[team.id] ?? '')
    if (isNaN(val)) return
    await supabase.from('teams').update({ score: val }).eq('id', team.id)
    setOverrideScoreInputs(prev => ({ ...prev, [team.id]: '' }))
  }

  const overridePosition = async (team: Team) => {
    const val = parseInt(overridePositionInputs[team.id] ?? '')
    const totalTiles = getTileCount(config.tiles_per_side)
    if (isNaN(val) || val < 0 || val >= totalTiles) return
    await supabase.from('teams').update({ position: val }).eq('id', team.id)
    setOverridePositionInputs(prev => ({ ...prev, [team.id]: '' }))
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

      {config.pot_total > 0 && teams.length > 0 && (
        <div className="bg-purple-950 border border-purple-700 rounded-lg p-3">
          <div className="text-sm font-semibold text-purple-300 mb-2">Award Pot to Team(s)</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => togglePotAwardTeam(team.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  potAwardTeamIds.includes(team.id)
                    ? 'bg-purple-600 border-purple-400 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-purple-500'
                }`}
              >
                <span>{team.icon}</span>
                <span>{team.name}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {potAwardTeamIds.length > 1 && (
              <span className="text-xs text-purple-400">
                {Math.floor(config.pot_total / potAwardTeamIds.length)} pts each
              </span>
            )}
            <button
              onClick={awardPot}
              disabled={potAwardTeamIds.length === 0}
              className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-1.5 rounded text-sm font-semibold"
            >
              Award {config.pot_total} pts
            </button>
          </div>
        </div>
      )}

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
                <button
                  onClick={() => setOverridePanelOpen(prev => ({ ...prev, [team.id]: !prev[team.id] }))}
                  title="Admin override (not logged)"
                  className={`text-xs px-2 py-1 rounded border ${
                    overridePanelOpen[team.id]
                      ? 'bg-amber-700 text-amber-100 border-amber-500'
                      : 'border-gray-600 text-gray-500 hover:border-amber-500 hover:text-amber-400'
                  }`}
                >
                  🔧
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

              {overridePanelOpen[team.id] && (
                <div className="mt-3 border border-dashed border-amber-800 rounded-lg p-3 bg-gray-900">
                  <div className="text-xs text-amber-600 font-semibold mb-2 uppercase tracking-wider">
                    Admin Override — not logged
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Set score to</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={overrideScoreInputs[team.id] ?? ''}
                          onChange={e => setOverrideScoreInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                          placeholder="Absolute score"
                          className="flex-1 bg-gray-800 text-gray-300 px-2 py-1.5 rounded text-sm border border-gray-700"
                        />
                        <button
                          onClick={() => overrideScore(team)}
                          className="bg-amber-800 hover:bg-amber-700 text-amber-100 px-3 py-1.5 rounded text-sm"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        Set position to (0–{getTileCount(config.tiles_per_side) - 1})
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          max={getTileCount(config.tiles_per_side) - 1}
                          value={overridePositionInputs[team.id] ?? ''}
                          onChange={e => setOverridePositionInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                          placeholder="Tile index"
                          className="flex-1 bg-gray-800 text-gray-300 px-2 py-1.5 rounded text-sm border border-gray-700"
                        />
                        <button
                          onClick={() => overridePosition(team)}
                          className="bg-amber-800 hover:bg-amber-700 text-amber-100 px-3 py-1.5 rounded text-sm"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
