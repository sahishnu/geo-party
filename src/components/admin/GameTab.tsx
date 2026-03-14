import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { Team, Tile, GameConfig } from '../../types/database'
import { wrapPosition, getTileCount } from '../../utils/boardGeometry'

interface Props {
  teams: Team[]
  tiles: Tile[]
  config: GameConfig
}

const DICE_CHARS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

export default function GameTab({ teams, tiles, config }: Props) {
  // Dice roller
  const [diceDisplay, setDiceDisplay] = useState<[number, number]>([1, 1])
  const [diceRolling, setDiceRolling] = useState(false)
  const [diceResult, setDiceResult] = useState<[number, number] | null>(null)
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Per-team manual move + score
  const [moveInputs, setMoveInputs] = useState<Record<string, string>>({})
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({})
  const [scoreNotes, setScoreNotes] = useState<Record<string, string>>({})
  const [overridePanelOpen, setOverridePanelOpen] = useState<Record<string, boolean>>({})
  const [overrideScoreInputs, setOverrideScoreInputs] = useState<Record<string, string>>({})
  const [overridePositionInputs, setOverridePositionInputs] = useState<Record<string, string>>({})
  const [potAwardTeamIds, setPotAwardTeamIds] = useState<string[]>([])
  const [pendingTax, setPendingTax] = useState<{ team: Team; amount: number; reason: string } | null>(null)
  const [pendingAction, setPendingAction] = useState<{ team: Team; action: 'jail' | 'start' } | null>(null)
  const [pendingTeamAction, setPendingTeamAction] = useState<{
    team: Team; type: 'add' | 'remove' | 'pot' | 'move'; amount: number; notes?: string
  } | null>(null)
  const [pendingShuffle, setPendingShuffle] = useState(false)
  const [pendingCommunism, setPendingCommunism] = useState(false)
  const [swapTeamIds, setSwapTeamIds] = useState<[string | null, string | null]>([null, null])
  const [swapPointsTeamIds, setSwapPointsTeamIds] = useState<[string | null, string | null]>([null, null])
  const [transferFromIds, setTransferFromIds] = useState<string[]>([])
  const [transferToIds, setTransferToIds] = useState<string[]>([])
  const [transferAmount, setTransferAmount] = useState('')
  const [pendingTransfer, setPendingTransfer] = useState<{
    fromTeams: Team[]; toTeams: Team[]; perFromDeduction: number; perToCredit: number; totalAmount: number
  } | null>(null)

  const tileMap = new Map(tiles.map(t => [t.position, t]))
  const currentTeam = teams.find(t => t.id === config.current_team_id) ?? null

  // Cleanup interval on unmount
  useEffect(() => () => { if (rollIntervalRef.current) clearInterval(rollIntervalRef.current) }, [])

  const rollDice = () => {
    if (diceRolling) return
    const d1 = Math.ceil(Math.random() * 6)
    const d2 = Math.ceil(Math.random() * 6)
    setDiceRolling(true)
    setDiceResult(null)

    let tick = 0
    rollIntervalRef.current = setInterval(() => {
      tick++
      if (tick >= 14) {
        clearInterval(rollIntervalRef.current!)
        setDiceDisplay([d1, d2])
        setDiceRolling(false)
        setDiceResult([d1, d2])
      } else {
        setDiceDisplay([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)])
      }
    }, 90)
  }

  const moveTeam = async (team: Team, spaces: number) => {
    if (!spaces || spaces < 1) return
    const totalTiles = getTileCount(config.tiles_per_side)
    const newPosition = wrapPosition(team.position + spaces, config.tiles_per_side)
    const landedTile = tileMap.get(newPosition)
    const lapsGained = Math.floor((team.position + spaces) / totalTiles)

    await supabase
      .from('teams')
      .update({ position: newPosition, laps: team.laps + lapsGained })
      .eq('id', team.id)

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
  }

  const moveDiceResult = async () => {
    if (!currentTeam || !diceResult) return
    const spaces = diceResult[0] + diceResult[1]
    await moveTeam(currentTeam, spaces)
    setDiceResult(null)
    setDiceDisplay([1, 1])
  }

  const getJailPosition = () => {
    const jailTile = tiles.find(t => t.tile_type === 'jail')
    return jailTile?.position ?? 8
  }

  const sendToJail = async (team: Team) => {
    const jailPosition = getJailPosition()
    await supabase.from('teams').update({ position: jailPosition }).eq('id', team.id)
    await supabase.from('events').insert({
      event_type: 'move',
      team_id: team.id,
      spaces_moved: 0,
      from_position: team.position,
      to_position: jailPosition,
      tile_label: 'Jail',
      notes: 'Sent to Jail',
    })
  }

  const sendToStart = async (team: Team) => {
    await supabase.from('teams').update({ position: 0 }).eq('id', team.id)
    await supabase.from('events').insert({
      event_type: 'move',
      team_id: team.id,
      spaces_moved: 0,
      from_position: team.position,
      to_position: 0,
      tile_label: tileMap.get(0)?.label ?? 'Start',
      notes: 'Sent to Start',
    })
  }

  const handleSpecialTile = async (team: Team, tile: Tile) => {
    if (tile.tile_type === 'jail') {
      await applyPenaltyToPot(team, config.jail_penalty, 'Jail penalty')
    } else if (tile.tile_type === 'go_to_jail') {
      await applyPenaltyToPot(team, config.jail_penalty, 'Jail penalty')
      await sendToJail(team)
    } else if (tile.tile_type === 'pay_taxes') {
      setPendingTax({ team, amount: config.tax_penalty, reason: 'Tax penalty' })
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

  const adjustScore = async (team: Team, delta: number, notesOverride?: string) => {
    if (!delta) return
    const notes = notesOverride ?? (scoreNotes[team.id]?.trim() || null)
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

  const toggleSwapTeam = (teamId: string) => {
    setSwapTeamIds(([a, b]) => {
      // Deselect if already selected
      if (a === teamId) return [null, b]
      if (b === teamId) return [a, null]
      // Fill first empty slot
      if (!a) return [teamId, b]
      if (!b) return [a, teamId]
      // Both filled — replace the first slot
      return [teamId, b]
    })
  }

  const swapPositions = async () => {
    const [idA, idB] = swapTeamIds
    if (!idA || !idB) return
    const teamA = teams.find(t => t.id === idA)
    const teamB = teams.find(t => t.id === idB)
    if (!teamA || !teamB) return

    const posA = teamA.position
    const posB = teamB.position

    await Promise.all([
      supabase.from('teams').update({ position: posB }).eq('id', teamA.id),
      supabase.from('teams').update({ position: posA }).eq('id', teamB.id),
    ])
    await Promise.all([
      supabase.from('events').insert({
        event_type: 'move',
        team_id: teamA.id,
        spaces_moved: 0,
        from_position: posA,
        to_position: posB,
        tile_label: tileMap.get(posB)?.label ?? 'Unknown',
        notes: `Position swapped with ${teamB.name}`,
      }),
      supabase.from('events').insert({
        event_type: 'move',
        team_id: teamB.id,
        spaces_moved: 0,
        from_position: posB,
        to_position: posA,
        tile_label: tileMap.get(posA)?.label ?? 'Unknown',
        notes: `Position swapped with ${teamA.name}`,
      }),
    ])
    setSwapTeamIds([null, null])
  }

  const toggleSwapPointsTeam = (teamId: string) => {
    setSwapPointsTeamIds(([a, b]) => {
      if (a === teamId) return [null, b]
      if (b === teamId) return [a, null]
      if (!a) return [teamId, b]
      if (!b) return [a, teamId]
      return [teamId, b]
    })
  }

  const swapPoints = async () => {
    const [idA, idB] = swapPointsTeamIds
    if (!idA || !idB) return
    const teamA = teams.find(t => t.id === idA)
    const teamB = teams.find(t => t.id === idB)
    if (!teamA || !teamB) return

    const scoreA = teamA.score
    const scoreB = teamB.score

    await Promise.all([
      supabase.from('teams').update({ score: scoreB }).eq('id', teamA.id),
      supabase.from('teams').update({ score: scoreA }).eq('id', teamB.id),
    ])
    await Promise.all([
      supabase.from('events').insert({
        event_type: 'score_change',
        team_id: teamA.id,
        points_delta: scoreB - scoreA,
        notes: `Points swapped with ${teamB.name}`,
      }),
      supabase.from('events').insert({
        event_type: 'score_change',
        team_id: teamB.id,
        points_delta: scoreA - scoreB,
        notes: `Points swapped with ${teamA.name}`,
      }),
    ])
    setSwapPointsTeamIds([null, null])
  }

  const executeTransfer = async (fromTeams: Team[], toTeams: Team[], perFromDeduction: number, perToCredit: number) => {
    await Promise.all(
      fromTeams.map(team =>
        supabase.from('teams').update({ score: team.score - perFromDeduction }).eq('id', team.id)
      )
    )
    await Promise.all(
      toTeams.map(team =>
        supabase.from('teams').update({ score: team.score + perToCredit }).eq('id', team.id)
      )
    )
    const toNames = toTeams.map(t => t.name).join(', ')
    const fromNames = fromTeams.map(t => t.name).join(', ')
    await Promise.all([
      ...fromTeams.map(team =>
        supabase.from('events').insert({
          event_type: 'score_change',
          team_id: team.id,
          points_delta: -perFromDeduction,
          notes: `Transferred ${perFromDeduction} pts to ${toNames}`,
        })
      ),
      ...toTeams.map(team =>
        supabase.from('events').insert({
          event_type: 'score_change',
          team_id: team.id,
          points_delta: perToCredit,
          notes: `Received ${perToCredit} pts from ${fromNames}`,
        })
      ),
    ])
    setTransferFromIds([])
    setTransferToIds([])
    setTransferAmount('')
  }

  const shufflePositions = async () => {
    const totalTiles = getTileCount(config.tiles_per_side)
    const allPositions = Array.from({ length: totalTiles }, (_, i) => i)
    for (let i = allPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]]
    }
    const positions = allPositions.slice(0, teams.length)
    await Promise.all(
      teams.map((team, i) =>
        supabase.from('teams').update({ position: positions[i] }).eq('id', team.id)
      )
    )
    await Promise.all(
      teams.map((team, i) =>
        supabase.from('events').insert({
          event_type: 'move',
          team_id: team.id,
          spaces_moved: 0,
          from_position: team.position,
          to_position: positions[i],
          tile_label: tileMap.get(positions[i])?.label ?? 'Unknown',
          notes: 'Positions shuffled',
        })
      )
    )
  }

  const redistributePoints = async () => {
    if (teams.length === 0) return
    const totalPoints = teams.reduce((sum, t) => sum + t.score, 0)
    const share = Math.floor(totalPoints / teams.length)
    await Promise.all(
      teams.map(team =>
        supabase.from('teams').update({ score: share }).eq('id', team.id)
      )
    )
    await Promise.all(
      teams.map(team =>
        supabase.from('events').insert({
          event_type: 'score_change',
          team_id: team.id,
          points_delta: share - team.score,
          notes: `Communism! Points redistributed equally (${share} pts each)`,
        })
      )
    )
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

      {/* ── Dice Roller ── */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-600">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          🎲 Dice Roller
          {currentTeam
            ? <span className="ml-2 text-yellow-400">→ {currentTeam.icon} {currentTeam.name}</span>
            : <span className="ml-2 text-gray-600">· set a current turn first</span>}
        </div>
        <div className="flex items-center gap-5">
          {/* Dice faces */}
          <div className="flex gap-3">
            {([diceDisplay[0], diceDisplay[1]] as [number, number]).map((val, i) => (
              <div
                key={i}
                className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-lg select-none"
                style={{
                  fontSize: 38,
                  transition: diceRolling ? 'none' : 'transform 0.2s',
                  transform: diceRolling ? `rotate(${(Math.random() - 0.5) * 20}deg)` : 'none',
                }}
              >
                {DICE_CHARS[val - 1]}
              </div>
            ))}
          </div>

          {/* Roll button */}
          <button
            onClick={rollDice}
            disabled={diceRolling || !currentTeam}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-5 py-3 rounded-xl font-bold text-base transition-colors"
          >
            {diceRolling ? 'Rolling…' : '🎲 Roll'}
          </button>

          {/* Result */}
          {diceResult && !diceRolling && (
            <div className="flex items-center gap-3 animate-in fade-in duration-200">
              <div className="text-2xl font-extrabold text-yellow-400 tabular-nums">
                = {diceResult[0] + diceResult[1]}
              </div>
              <button
                onClick={moveDiceResult}
                disabled={!currentTeam}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
              >
                Move {currentTeam?.icon}
              </button>
              <button
                onClick={() => { setDiceResult(null); setDiceDisplay([1, 1]) }}
                className="text-gray-500 hover:text-gray-300 text-sm"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Pot award ── */}
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

      {/* ── Per-team controls ── */}
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
                    {team.laps > 0 && (
                      <span className="ml-2 text-blue-400">· 🔁 {team.laps} {team.laps === 1 ? 'lap' : 'laps'}</span>
                    )}
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
                  onClick={() => setPendingAction({ team, action: 'jail' })}
                  title="Send to Jail"
                  className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:border-orange-400 hover:text-orange-400"
                >
                  🚔 Jail
                </button>
                <button
                  onClick={() => setPendingAction({ team, action: 'start' })}
                  title="Send to Start"
                  className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:border-green-400 hover:text-green-400"
                >
                  🏠 Start
                </button>
                <button
                  onClick={async () => {
                    await supabase.from('teams').update({ has_multiplier: !team.has_multiplier }).eq('id', team.id)
                  }}
                  title="Toggle x2 multiplier"
                  className={`text-xs px-2 py-1 rounded border font-bold ${
                    team.has_multiplier
                      ? 'bg-fuchsia-700 text-fuchsia-100 border-fuchsia-500'
                      : 'border-gray-600 text-gray-400 hover:border-fuchsia-400 hover:text-fuchsia-400'
                  }`}
                >
                  x2
                </button>
                <button
                  onClick={async () => {
                    await supabase.from('teams').update({ has_hot_potato: !team.has_hot_potato }).eq('id', team.id)
                  }}
                  title="Toggle Hot Potato"
                  className={`text-xs px-2 py-1 rounded border ${
                    team.has_hot_potato
                      ? 'bg-red-700 text-red-100 border-red-500'
                      : 'border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-400'
                  }`}
                >
                  🥔
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
                  <label className="text-xs text-gray-400 block mb-1">Manual Move</label>
                  <div className="flex gap-2">
                    <input type="number" min={1} max={12}
                      value={moveInputs[team.id] ?? ''}
                      onChange={e => setMoveInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                      placeholder="Spaces"
                      className="flex-1 bg-gray-700 text-white px-2 py-1.5 rounded text-sm" />
                    <button onClick={() => {
                      const spaces = parseInt(moveInputs[team.id] ?? '0')
                      if (!spaces || spaces < 1) return
                      setPendingTeamAction({ team, type: 'move', amount: spaces })
                    }}
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
                      onClick={() => {
                        const pts = parseInt(scoreInputs[team.id] ?? '0')
                        if (!pts) return
                        setPendingTeamAction({ team, type: 'add', amount: Math.abs(pts), notes: scoreNotes[team.id]?.trim() || undefined })
                      }}
                      className="bg-green-600 hover:bg-green-500 text-white px-2 py-1.5 rounded text-sm">+</button>
                    <button
                      onClick={() => {
                        const pts = parseInt(scoreInputs[team.id] ?? '0')
                        if (!pts) return
                        setPendingTeamAction({ team, type: 'remove', amount: Math.abs(pts), notes: scoreNotes[team.id]?.trim() || undefined })
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded text-sm">−</button>
                    <button onClick={() => {
                        const pts = parseInt(scoreInputs[team.id] ?? '0')
                        if (!pts || pts <= 0) return
                        setPendingTeamAction({ team, type: 'pot', amount: Math.abs(pts), notes: scoreNotes[team.id]?.trim() || undefined })
                      }}
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

      {/* ── Swap Positions ── */}
      {teams.length >= 2 && (
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-600">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            🔄 Swap Positions
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {teams.map(team => {
              const isA = swapTeamIds[0] === team.id
              const isB = swapTeamIds[1] === team.id
              const slot = isA ? 'A' : isB ? 'B' : null
              return (
                <button
                  key={team.id}
                  onClick={() => toggleSwapTeam(team.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    isA
                      ? 'bg-cyan-700 border-cyan-400 text-white'
                      : isB
                      ? 'bg-teal-700 border-teal-400 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-cyan-500'
                  }`}
                >
                  {slot && (
                    <span className="text-xs font-bold opacity-80">{slot}</span>
                  )}
                  <span>{team.icon}</span>
                  <span>{team.name}</span>
                  <span className="text-xs opacity-60">#{team.position}</span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-3">
            {swapTeamIds[0] && swapTeamIds[1] ? (
              <>
                <span className="text-xs text-gray-400">
                  {teams.find(t => t.id === swapTeamIds[0])?.icon}{' '}
                  Tile {teams.find(t => t.id === swapTeamIds[0])?.position}
                  {' '}↔{' '}
                  {teams.find(t => t.id === swapTeamIds[1])?.icon}{' '}
                  Tile {teams.find(t => t.id === swapTeamIds[1])?.position}
                </span>
                <button
                  onClick={swapPositions}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  🔄 Swap
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-500 italic">
                {swapTeamIds[0] ? 'Select a second team' : 'Select two teams to swap'}
              </span>
            )}
            {(swapTeamIds[0] || swapTeamIds[1]) && (
              <button
                onClick={() => setSwapTeamIds([null, null])}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Swap Points ── */}
      {teams.length >= 2 && (
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-600">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            💰 Swap Points
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {teams.map(team => {
              const isA = swapPointsTeamIds[0] === team.id
              const isB = swapPointsTeamIds[1] === team.id
              const slot = isA ? 'A' : isB ? 'B' : null
              return (
                <button
                  key={team.id}
                  onClick={() => toggleSwapPointsTeam(team.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    isA
                      ? 'bg-amber-700 border-amber-400 text-white'
                      : isB
                      ? 'bg-orange-700 border-orange-400 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-amber-500'
                  }`}
                >
                  {slot && (
                    <span className="text-xs font-bold opacity-80">{slot}</span>
                  )}
                  <span>{team.icon}</span>
                  <span>{team.name}</span>
                  <span className="text-xs opacity-60">{team.score} pts</span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-3">
            {swapPointsTeamIds[0] && swapPointsTeamIds[1] ? (
              <>
                <span className="text-xs text-gray-400">
                  {teams.find(t => t.id === swapPointsTeamIds[0])?.icon}{' '}
                  {teams.find(t => t.id === swapPointsTeamIds[0])?.score} pts
                  {' '}↔{' '}
                  {teams.find(t => t.id === swapPointsTeamIds[1])?.icon}{' '}
                  {teams.find(t => t.id === swapPointsTeamIds[1])?.score} pts
                </span>
                <button
                  onClick={swapPoints}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  💰 Swap
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-500 italic">
                {swapPointsTeamIds[0] ? 'Select a second team' : 'Select two teams to swap points'}
              </span>
            )}
            {(swapPointsTeamIds[0] || swapPointsTeamIds[1]) && (
              <button
                onClick={() => setSwapPointsTeamIds([null, null])}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Transfer Points ── */}
      {teams.length >= 2 && (
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-600">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            🔀 Transfer Points
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start mb-3">
            {/* From teams */}
            <div>
              <div className="text-xs text-red-400 font-semibold mb-1">From</div>
              <div className="flex flex-wrap gap-1.5">
                {teams.map(team => {
                  const selected = transferFromIds.includes(team.id)
                  const isTo = transferToIds.includes(team.id)
                  return (
                    <button
                      key={team.id}
                      disabled={isTo}
                      onClick={() => setTransferFromIds(prev =>
                        selected ? prev.filter(id => id !== team.id) : [...prev, team.id]
                      )}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition ${
                        selected
                          ? 'bg-red-700 border-red-400 text-white'
                          : isTo
                          ? 'bg-gray-900 border-gray-700 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-red-500'
                      }`}
                    >
                      <span>{team.icon}</span>
                      <span>{team.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col items-center gap-1 pt-4">
              <span className="text-gray-500 text-lg">→</span>
              <input
                type="number"
                min={1}
                value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                placeholder="Pts"
                className="w-20 bg-gray-700 text-white px-2 py-1.5 rounded text-sm text-center"
              />
              <span className="text-[10px] text-gray-500">per team</span>
            </div>

            {/* To teams */}
            <div>
              <div className="text-xs text-green-400 font-semibold mb-1">To</div>
              <div className="flex flex-wrap gap-1.5">
                {teams.map(team => {
                  const selected = transferToIds.includes(team.id)
                  const isFrom = transferFromIds.includes(team.id)
                  return (
                    <button
                      key={team.id}
                      disabled={isFrom}
                      onClick={() => setTransferToIds(prev =>
                        selected ? prev.filter(id => id !== team.id) : [...prev, team.id]
                      )}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition ${
                        selected
                          ? 'bg-green-700 border-green-400 text-white'
                          : isFrom
                          ? 'bg-gray-900 border-gray-700 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-green-500'
                      }`}
                    >
                      <span>{team.icon}</span>
                      <span>{team.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {transferFromIds.length > 0 && transferToIds.length > 0 && parseInt(transferAmount) > 0 ? (
              <>
                <span className="text-xs text-gray-400">
                  {transferFromIds.map(id => teams.find(t => t.id === id)?.icon).join(' ')}
                  {' '}-{transferAmount} pts each → +{Math.floor((parseInt(transferAmount) * transferFromIds.length) / transferToIds.length)} pts each{' '}
                  {transferToIds.map(id => teams.find(t => t.id === id)?.icon).join(' ')}
                </span>
                <button
                  onClick={() => {
                    const amt = parseInt(transferAmount)
                    const totalPool = amt * transferFromIds.length
                    const perTo = Math.floor(totalPool / transferToIds.length)
                    const fromTeams = teams.filter(t => transferFromIds.includes(t.id))
                    const toTeams = teams.filter(t => transferToIds.includes(t.id))
                    setPendingTransfer({ fromTeams, toTeams, perFromDeduction: amt, perToCredit: perTo, totalAmount: totalPool })
                  }}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  🔀 Transfer
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-500 italic">
                Select from/to teams and enter an amount
              </span>
            )}
            {(transferFromIds.length > 0 || transferToIds.length > 0) && (
              <button
                onClick={() => { setTransferFromIds([]); setTransferToIds([]); setTransferAmount('') }}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Shuffle Positions ── */}
      {teams.length >= 2 && (
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              🎲 Shuffle Positions
            </div>
            <button
              onClick={() => setPendingShuffle(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              🎲 Shuffle All
            </button>
          </div>
        </div>
      )}

      {/* ── Communism ── */}
      {teams.length >= 2 && (
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              ☭ Communism
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                Total: {teams.reduce((s, t) => s + t.score, 0)} pts → {Math.floor(teams.reduce((s, t) => s + t.score, 0) / teams.length)} pts each
              </span>
              <button
                onClick={() => setPendingCommunism(true)}
                className="bg-red-700 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              >
                ☭ Redistribute
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingTransfer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-bold text-white">🔀 Transfer Points</h3>
            <div className="text-gray-300 text-sm space-y-2">
              <p>
                Deduct <span className="font-semibold text-red-400">{pendingTransfer.perFromDeduction} pts</span> from each:
              </p>
              <div className="flex flex-wrap gap-1.5 ml-2">
                {pendingTransfer.fromTeams.map(t => (
                  <span key={t.id} className="inline-flex items-center gap-1 text-sm">
                    {t.icon} {t.name}
                  </span>
                ))}
              </div>
              <p>
                Give <span className="font-semibold text-green-400">{pendingTransfer.perToCredit} pts</span> to each:
              </p>
              <div className="flex flex-wrap gap-1.5 ml-2">
                {pendingTransfer.toTeams.map(t => (
                  <span key={t.id} className="inline-flex items-center gap-1 text-sm">
                    {t.icon} {t.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Total transferred: {pendingTransfer.totalAmount} pts
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingTransfer(null)}
                className="px-4 py-2 rounded text-sm font-semibold border border-gray-500 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await executeTransfer(
                    pendingTransfer.fromTeams,
                    pendingTransfer.toTeams,
                    pendingTransfer.perFromDeduction,
                    pendingTransfer.perToCredit,
                  )
                  setPendingTransfer(null)
                }}
                className="px-4 py-2 rounded text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingCommunism && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-bold text-white">☭ Communism</h3>
            <p className="text-gray-300 text-sm">
              Redistribute all points equally? Each team will receive{' '}
              <span className="font-semibold text-white">{Math.floor(teams.reduce((s, t) => s + t.score, 0) / teams.length)} pts</span>.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingCommunism(false)}
                className="px-4 py-2 rounded text-sm font-semibold border border-gray-500 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await redistributePoints()
                  setPendingCommunism(false)
                }}
                className="px-4 py-2 rounded text-sm font-semibold bg-red-700 hover:bg-red-600 text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingShuffle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-bold text-white">Shuffle Positions</h3>
            <p className="text-gray-300 text-sm">
              Randomly shuffle the board positions of all {teams.length} teams?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingShuffle(false)}
                className="px-4 py-2 rounded text-sm font-semibold border border-gray-500 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await shufflePositions()
                  setPendingShuffle(false)
                }}
                className="px-4 py-2 rounded text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-bold text-white">
              {pendingAction.action === 'jail' ? 'Send to Jail' : 'Send to Start'}
            </h3>
            <p className="text-gray-300 text-sm">
              Send <span className="font-semibold">{pendingAction.team.icon} {pendingAction.team.name}</span> to{' '}
              <span className="font-semibold">{pendingAction.action === 'jail' ? 'Jail' : 'Start (position 0)'}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingAction(null)}
                className="px-4 py-2 rounded text-sm font-semibold border border-gray-500 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (pendingAction.action === 'jail') {
                    await sendToJail(pendingAction.team)
                  } else {
                    await sendToStart(pendingAction.team)
                  }
                  setPendingAction(null)
                }}
                className={`px-4 py-2 rounded text-sm font-semibold text-white ${
                  pendingAction.action === 'jail'
                    ? 'bg-orange-600 hover:bg-orange-500'
                    : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingTeamAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-bold text-white">
              {pendingTeamAction.type === 'add' && 'Add Points'}
              {pendingTeamAction.type === 'remove' && 'Remove Points'}
              {pendingTeamAction.type === 'pot' && 'Send Points to Pot'}
              {pendingTeamAction.type === 'move' && 'Move Team'}
            </h3>
            <p className="text-gray-300 text-sm">
              {pendingTeamAction.type === 'add' && (
                <>Add <span className="font-semibold text-green-400">{pendingTeamAction.amount} pts</span> to <span className="font-semibold">{pendingTeamAction.team.icon} {pendingTeamAction.team.name}</span>?</>
              )}
              {pendingTeamAction.type === 'remove' && (
                <>Remove <span className="font-semibold text-red-400">{pendingTeamAction.amount} pts</span> from <span className="font-semibold">{pendingTeamAction.team.icon} {pendingTeamAction.team.name}</span>?</>
              )}
              {pendingTeamAction.type === 'pot' && (
                <>Deduct <span className="font-semibold text-purple-400">{pendingTeamAction.amount} pts</span> from <span className="font-semibold">{pendingTeamAction.team.icon} {pendingTeamAction.team.name}</span> and send to pot?</>
              )}
              {pendingTeamAction.type === 'move' && (
                <>Move <span className="font-semibold">{pendingTeamAction.team.icon} {pendingTeamAction.team.name}</span> forward <span className="font-semibold text-blue-400">{pendingTeamAction.amount} spaces</span>?</>
              )}
            </p>
            {pendingTeamAction.notes && (
              <p className="text-xs text-gray-500">Notes: {pendingTeamAction.notes}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingTeamAction(null)}
                className="px-4 py-2 rounded text-sm font-semibold border border-gray-500 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const { team, type, amount, notes } = pendingTeamAction
                  if (type === 'add') {
                    await adjustScore(team, amount, notes)
                  } else if (type === 'remove') {
                    await adjustScore(team, -amount, notes)
                  } else if (type === 'pot') {
                    // Replicate addManualPenaltyToPot but with confirmed amount/notes
                    await applyPenaltyToPot(team, amount, notes || 'Manual penalty')
                    setScoreInputs(prev => ({ ...prev, [team.id]: '' }))
                    setScoreNotes(prev => ({ ...prev, [team.id]: '' }))
                  } else if (type === 'move') {
                    await moveTeam(team, amount)
                    setMoveInputs(prev => ({ ...prev, [team.id]: '' }))
                  }
                  setPendingTeamAction(null)
                }}
                className={`px-4 py-2 rounded text-sm font-semibold text-white ${
                  pendingTeamAction.type === 'add' ? 'bg-green-600 hover:bg-green-500'
                    : pendingTeamAction.type === 'remove' ? 'bg-red-600 hover:bg-red-500'
                    : pendingTeamAction.type === 'pot' ? 'bg-purple-700 hover:bg-purple-600'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingTax && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-bold text-white">Confirm Tax Deduction</h3>
            <p className="text-gray-300 text-sm">
              Deduct <span className="font-semibold text-red-400">{pendingTax.amount} pts</span> from{' '}
              <span className="font-semibold">{pendingTax.team.icon} {pendingTax.team.name}</span> and send to pot?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingTax(null)}
                className="px-4 py-2 rounded text-sm font-semibold border border-gray-500 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await applyPenaltyToPot(pendingTax.team, pendingTax.amount, pendingTax.reason)
                  setPendingTax(null)
                }}
                className="px-4 py-2 rounded text-sm font-semibold bg-red-600 hover:bg-red-500 text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
