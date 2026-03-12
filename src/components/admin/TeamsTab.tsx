import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Team } from '../../types/database'
import {
  DndContext, closestCenter, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const ICON_OPTIONS = ['🎮','🚀','🌟','🔥','🎯','🏆','🦊','🐲','🎸','⚡','🌈','🎲']

function SortableTeamRow({ team, onDelete }: { team: Team; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: team.id })
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const [icon, setIcon] = useState(team.icon)

  const save = async () => {
    await supabase.from('teams').update({ name, icon }).eq('id', team.id)
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg border border-gray-600"
    >
      <span {...attributes} {...listeners} className="cursor-grab text-gray-500 select-none">⠿</span>
      {editing ? (
        <>
          <div className="flex flex-wrap gap-1">
            {ICON_OPTIONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)}
                className={`text-xl p-1 rounded ${ic === icon ? 'bg-blue-600' : 'bg-gray-700'}`}>
                {ic}
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-gray-700 text-white px-2 py-1 rounded flex-1"
          />
          <button onClick={save} className="text-green-400 font-semibold text-sm">Save</button>
        </>
      ) : (
        <>
          <span className="text-2xl">{team.icon}</span>
          <span className="flex-1 font-semibold">{team.name}</span>
          <span className="text-gray-400 text-sm">{team.score} pts</span>
          <button onClick={() => setEditing(true)} className="text-blue-400 text-sm">Edit</button>
          <button onClick={() => onDelete(team.id)} className="text-red-400 text-sm">Remove</button>
        </>
      )}
    </div>
  )
}

export default function TeamsTab({ teams }: { teams: Team[] }) {
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('🎮')

  const addTeam = async () => {
    if (!newName.trim()) return
    const maxOrder = teams.reduce((m, t) => Math.max(m, t.turn_order), -1)
    await supabase.from('teams').insert({ name: newName.trim(), icon: newIcon, turn_order: maxOrder + 1 })
    setNewName('')
  }

  const deleteTeam = async (id: string) => {
    await supabase.from('teams').delete().eq('id', id)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = teams.findIndex(t => t.id === active.id)
    const newIndex = teams.findIndex(t => t.id === over.id)
    const reordered = arrayMove(teams, oldIndex, newIndex)
    await Promise.all(
      reordered.map((team, i) =>
        supabase.from('teams').update({ turn_order: i }).eq('id', team.id)
      )
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Teams</h2>

      <div className="flex gap-2 items-center bg-gray-800 p-3 rounded-lg flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {ICON_OPTIONS.map(ic => (
            <button key={ic} onClick={() => setNewIcon(ic)}
              className={`text-xl p-1 rounded ${ic === newIcon ? 'bg-blue-600' : 'bg-gray-700'}`}>
              {ic}
            </button>
          ))}
        </div>
        <input
          placeholder="Team name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTeam()}
          className="bg-gray-700 text-white px-3 py-2 rounded flex-1 min-w-32"
        />
        <button onClick={addTeam}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-semibold">
          Add Team
        </button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={teams.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {teams.map(team => (
              <SortableTeamRow key={team.id} team={team} onDelete={deleteTeam} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {teams.length === 0 && (
        <p className="text-gray-500 italic text-sm">No teams yet. Add one above.</p>
      )}
    </div>
  )
}
