# Silent Team Override — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a collapsible, silent override panel to each team card in the Game tab that lets the host directly set a team's score or board position without logging any event or triggering any game side-effects.

**Architecture:** Single-file change to `src/components/admin/GameTab.tsx`. Two new state maps track (1) which team cards have the override panel open, and (2) the override input values. Two new async handlers call `supabase.from('teams').update(...)` directly without inserting into `events`. No DB migrations required.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Supabase JS client v2

---

## Task 1: Add Override State and Handlers to GameTab

**Files:**
- Modify: `src/components/admin/GameTab.tsx`

### Step 1: Add three new state variables

Inside `GameTab`, after the existing `useState` declarations (lines 13–15), add:

```ts
const [overridePanelOpen, setOverridePanelOpen] = useState<Record<string, boolean>>({})
const [overrideScoreInputs, setOverrideScoreInputs] = useState<Record<string, string>>({})
const [overridePositionInputs, setOverridePositionInputs] = useState<Record<string, string>>({})
```

### Step 2: Add the `overrideScore` handler

After the existing `setCurrentTurn` function (around line 100), add:

```ts
const overrideScore = async (team: Team) => {
  const val = parseInt(overrideScoreInputs[team.id] ?? '')
  if (isNaN(val)) return
  await supabase.from('teams').update({ score: val }).eq('id', team.id)
  setOverrideScoreInputs(prev => ({ ...prev, [team.id]: '' }))
}
```

### Step 3: Add the `overridePosition` handler

Immediately after `overrideScore`, add:

```ts
const overridePosition = async (team: Team) => {
  const val = parseInt(overridePositionInputs[team.id] ?? '')
  const totalTiles = getTileCount(config.tiles_per_side)
  if (isNaN(val) || val < 0 || val >= totalTiles) return
  await supabase.from('teams').update({ position: val }).eq('id', team.id)
  setOverridePositionInputs(prev => ({ ...prev, [team.id]: '' }))
}
```

Note: `getTileCount` is already imported from `../../utils/boardGeometry` — add it to the existing import if not present.

### Step 4: Verify the import line includes `getTileCount`

The existing import at line 4 is:
```ts
import { wrapPosition } from '../../utils/boardGeometry'
```

Change it to:
```ts
import { wrapPosition, getTileCount } from '../../utils/boardGeometry'
```

---

## Task 2: Add Override Toggle Button to Each Team Card Header

**Files:**
- Modify: `src/components/admin/GameTab.tsx`

### Step 1: Add the wrench toggle button

In the team card header row (the `flex items-center gap-3 mb-3` div, around line 123), add a wrench button after the existing "Set Turn" button:

```tsx
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
```

---

## Task 3: Add the Collapsible Override Panel

**Files:**
- Modify: `src/components/admin/GameTab.tsx`

### Step 1: Add the panel below the existing score/move grid

After the closing `</div>` of the `grid grid-cols-2 gap-4` div (around line 178), and before the outer card's closing `</div>`, add:

```tsx
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
```

---

## Task 4: Manual Verification

**Step 1: Start the dev server**

```bash
npm run dev
```

**Step 2: Open the admin panel at `http://localhost:5173/admin`**

**Step 3: Verify the wrench button appears on each team card**
- Click 🔧 on a team → override panel expands with amber dashed border
- Click 🔧 again → panel collapses

**Step 4: Test score override**
- Enter an absolute number in "Set score to" → click Set
- The team's score on the board view (`/`) updates immediately
- The Event Log tab shows NO new event for this action

**Step 5: Test position override**
- Enter a valid tile index in "Set position to" → click Set
- The team's token on the board jumps to the new tile with no animation
- The Event Log tab shows NO new event for this action

**Step 6: Test invalid inputs**
- Leave input empty → click Set → nothing happens
- Enter a position greater than totalTiles−1 → click Set → nothing happens

---

## Task 5: Commit

```bash
git add src/components/admin/GameTab.tsx docs/plans/2026-03-11-silent-override-design.md docs/plans/2026-03-11-silent-override-implementation.md
git commit -m "feat: add silent admin override for team score and position"
```
