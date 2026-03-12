import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Activity, GameMode } from '../../types/database'
import { getTileColors } from '../../utils/tileColors'

const GAME_MODES: { value: GameMode; label: string }[] = [
  { value: 'solo', label: 'Solo' },
  { value: 'head_to_head', label: 'Head to Head' },
  { value: 'all_teams', label: 'All Teams' },
  { value: 'team_relay', label: 'Team Relay' },
]

const TIMER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'No timer' },
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
  { value: 120, label: '2m' },
]

const getModeColor = (mode: GameMode) => {
  if (mode === 'team_relay') return getTileColors('misc').stripeColor
  return getTileColors(mode).stripeColor
}

export default function ActivitiesTab({ activities }: { activities: Activity[] }) {
  const [title, setTitle] = useState('')
  const [gameMode, setGameMode] = useState<GameMode>('solo')
  const [timerDuration, setTimerDuration] = useState<number | null>(null)
  const [pendingActivity, setPendingActivity] = useState<Activity | null>(null)
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null)

  const addActivity = async () => {
    if (!title.trim()) return
    await supabase.from('activities').insert({
      title: title.trim(),
      game_mode: gameMode,
    })
    setTitle('')
  }

  const deleteActivity = async (id: string) => {
    await supabase.from('activities').delete().eq('id', id)
  }

  const broadcastActivity = async (activity: Activity) => {
    const color = getModeColor(activity.game_mode)
    await supabase.channel('activity_display').send({
      type: 'broadcast',
      event: 'show_activity',
      payload: {
        title: activity.title,
        color,
        game_mode: activity.game_mode,
        duration: timerDuration,
      },
    })
    setPendingActivity(null)
    setPendingMode(null)
  }

  const rollRandom = (mode: GameMode) => {
    const group = activities.filter(a => a.game_mode === mode)
    if (!group.length) return
    const activity = group[Math.floor(Math.random() * group.length)]
    setPendingActivity(activity)
    setPendingMode(mode)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Activities</h2>

      {/* Timer selector */}
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-600">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          ⏱ Activity Timer
        </div>
        <div className="flex gap-2 flex-wrap">
          {TIMER_OPTIONS.map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setTimerDuration(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                timerDuration === opt.value
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-blue-500 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add form */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-600 space-y-3">
        <h3 className="font-bold text-lg">Add Activity</h3>
        <div className="flex gap-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addActivity()}
            placeholder="Activity title"
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
          />
          <select
            value={gameMode}
            onChange={e => setGameMode(e.target.value as GameMode)}
            className="bg-gray-700 text-white px-3 py-2 rounded text-sm"
          >
            {GAME_MODES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button
            onClick={addActivity}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-semibold"
          >
            Add
          </button>
        </div>
      </div>

      {/* Activities grouped by game mode */}
      {activities.length === 0 && (
        <p className="text-gray-500 italic text-sm">No activities yet. Add one above.</p>
      )}

      {GAME_MODES.map(({ value: mode, label }) => {
        const group = activities.filter(a => a.game_mode === mode)
        if (group.length === 0) return null
        const color = getModeColor(mode)
        return (
          <div key={mode} className="bg-gray-800 rounded-xl p-4 border border-gray-600 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg" style={{ color }}>{label}</h3>
              <button
                onClick={() => rollRandom(mode)}
                className="px-3 py-1.5 rounded text-sm font-semibold text-white hover:opacity-80"
                style={{ backgroundColor: color }}
              >
                🎲 Random
              </button>
            </div>
            {group.map(activity => (
              <div
                key={activity.id}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:ring-2 hover:ring-white/30 transition-all"
                style={{ backgroundColor: color + '33', borderLeft: `4px solid ${color}` }}
                onClick={() => broadcastActivity(activity)}
              >
                <span className="text-sm font-semibold text-white">{activity.title}</span>
                {timerDuration && (
                  <span className="text-xs text-white/50 ml-1">⏱ {timerDuration}s</span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); deleteActivity(activity.id) }}
                  className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )
      })}

      {/* Confirmation modal for random pick */}
      {pendingActivity && pendingMode && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => { setPendingActivity(null); setPendingMode(null) }}
        >
          <div
            className="max-w-md w-full mx-4 rounded-2xl p-8 text-center border-2 bg-gray-800 shadow-2xl"
            style={{ borderColor: getModeColor(pendingMode) }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="text-sm uppercase tracking-widest mb-3"
              style={{ color: getModeColor(pendingMode) }}
            >
              Random {GAME_MODES.find(m => m.value === pendingMode)?.label} Activity
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {pendingActivity.title}
            </div>
            {timerDuration && (
              <div className="text-sm text-gray-400 mb-6">⏱ {timerDuration}s timer</div>
            )}
            {!timerDuration && <div className="mb-6" />}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => rollRandom(pendingMode)}
                className="px-4 py-2 rounded text-sm font-semibold bg-gray-600 hover:bg-gray-500 text-white"
              >
                🎲 Re-roll
              </button>
              <button
                onClick={() => { setPendingActivity(null); setPendingMode(null) }}
                className="px-4 py-2 rounded text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => broadcastActivity(pendingActivity)}
                className="px-4 py-2 rounded text-sm font-semibold text-white"
                style={{ backgroundColor: getModeColor(pendingMode) }}
              >
                ✅ Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
