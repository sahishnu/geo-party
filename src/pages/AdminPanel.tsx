import { useState } from 'react'
import { useGameConfig } from '../hooks/useGameConfig'
import { useTeams } from '../hooks/useTeams'
import { useTiles } from '../hooks/useTiles'
import { useEvents } from '../hooks/useEvents'
import { useCards } from '../hooks/useCards'
import GameTab from '../components/admin/GameTab'
import TeamsTab from '../components/admin/TeamsTab'
import BoardTab from '../components/admin/BoardTab'
import CardDecksTab from '../components/admin/CardDecksTab'
import EventLogTab from '../components/admin/EventLogTab'
import SettingsTab from '../components/admin/SettingsTab'

type Tab = 'game' | 'teams' | 'board' | 'cards' | 'events' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'game',     label: '🎮 Game' },
  { id: 'teams',    label: '👥 Teams' },
  { id: 'board',    label: '🗺️ Board' },
  { id: 'cards',    label: '🃏 Cards' },
  { id: 'events',   label: '📋 Events' },
  { id: 'settings', label: '⚙️ Settings' },
]

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('game')
  const { config, loading } = useGameConfig()
  const { teams } = useTeams()
  const { tiles } = useTiles()
  const { events } = useEvents(200)
  const { cards } = useCards()

  if (loading || !config) {
    return (
      <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const sortedTeams = [...teams].sort((a, b) => a.turn_order - b.turn_order)

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      {/* Header */}
      <div className="border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">{config.game_name} · Admin</h1>
        <a href="/" target="_blank" rel="noreferrer"
          className="text-sm text-blue-400 hover:underline">
          Open Board View ↗
        </a>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 px-4 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 max-w-4xl mx-auto">
        {activeTab === 'game'     && <GameTab teams={sortedTeams} tiles={tiles} config={config} />}
        {activeTab === 'teams'    && <TeamsTab teams={sortedTeams} />}
        {activeTab === 'board'    && <BoardTab tiles={tiles} config={config} />}
        {activeTab === 'cards'    && <CardDecksTab cards={cards} />}
        {activeTab === 'events'   && <EventLogTab events={events} teams={teams} />}
        {activeTab === 'settings' && <SettingsTab config={config} />}
      </div>
    </div>
  )
}
