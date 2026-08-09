// Local, database-free backend for JeoParty.
//
// Holds all game state in memory, mirrors it to localStorage for persistence,
// and syncs changes across browser windows via a single BroadcastChannel — no
// server, no Supabase. `src/lib/supabase.ts` is a thin Supabase-compatible
// facade over this module, so the app's hooks and admin components call it
// unchanged.
//
// Model: single-host. One window drives /admin (the source of truth); other
// windows show / (the board) and react to changes. State seeds from the
// bundled demo data (src/data/seed.json) on first load.

import seed from '../data/seed.json'

export type Row = Record<string, unknown>

export type TableName =
  | 'game_config' | 'teams' | 'tiles' | 'events' | 'cards' | 'activities'

export interface DB {
  game_config: Row[]
  teams: Row[]
  tiles: Row[]
  events: Row[]
  cards: Row[]
  activities: Row[]
}

export type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE'

export interface ChangePayload {
  eventType: ChangeType
  table: TableName
  new: Row | null
  old: Row | null
}

export interface Filter {
  op: 'eq' | 'neq'
  col: string
  val: unknown
}

const LS_KEY = 'jeoparty:db'
const CHANNEL_NAME = 'jeoparty'
// Stable singleton id for the one game_config row. Must differ from the
// all-zero sentinel the app uses in `.neq('id', ...)` bulk deletes.
const CONFIG_ID = '00000000-0000-0000-0000-000000000001'

const ALL_TABLES: TableName[] = [
  'game_config', 'teams', 'tiles', 'events', 'cards', 'activities',
]

// ── Seed shape (mirrors SettingsTab's importer) ─────────────────────────────

interface SeedShape {
  settings?: {
    game_name?: string
    game_description?: string
    tiles_per_side?: number
    jail_penalty?: number
    tax_penalty?: number
    starting_score?: number
  }
  teams?: { name: string; icon: string }[]
  tiles?: { position: number; label?: string; tile_type: string; color_group?: string; image_url?: string | null }[]
  cards?: { deck_type: string; title?: string; content: string; emoji?: string }[]
  activities?: { title: string; game_mode: string }[]
}

// ── Ids + timestamps ────────────────────────────────────────────────────────

// Monotonic clock so rows ordered by created_at keep a stable, insertion order
// even when many are created within the same millisecond.
let lastTs = 0
function nowIso(): string {
  const t = Math.max(Date.now(), lastTs + 1)
  lastTs = t
  return new Date(t).toISOString()
}

function uid(): string {
  return crypto.randomUUID()
}

const HAS_CREATED_AT: Record<TableName, boolean> = {
  game_config: false,
  teams: true,
  tiles: false,
  events: true,
  cards: true,
  activities: true,
}

// Fill in an id (and created_at where the table has one) the way Postgres
// defaults would have, without clobbering anything the caller supplied.
function withMeta(table: TableName, row: Row): Row {
  const out: Row = { id: uid(), ...row }
  if (HAS_CREATED_AT[table] && out.created_at === undefined) out.created_at = nowIso()
  return out
}

// ── Build the seeded database ───────────────────────────────────────────────

function buildSeededDB(s: SeedShape): DB {
  const settings = s.settings ?? {}
  const startingScore = settings.starting_score ?? 0
  return {
    game_config: [{
      id: CONFIG_ID,
      game_name: settings.game_name ?? 'JeoParty',
      game_description: settings.game_description ?? '',
      tiles_per_side: settings.tiles_per_side ?? 9,
      jail_penalty: settings.jail_penalty ?? 50,
      tax_penalty: settings.tax_penalty ?? 50,
      pot_total: 0,
      current_team_id: null,
    }],
    teams: (s.teams ?? []).map((t, i) => withMeta('teams', {
      name: t.name, icon: t.icon, turn_order: i,
      score: startingScore, position: 0, laps: 0,
      has_multiplier: false, has_hot_potato: false,
    })),
    tiles: (s.tiles ?? []).map((t) => withMeta('tiles', {
      position: t.position, label: t.label ?? '', tile_type: t.tile_type,
      color_group: t.color_group ?? t.tile_type, image_url: t.image_url ?? null,
    })),
    cards: (s.cards ?? []).map((c) => withMeta('cards', {
      deck_type: c.deck_type, title: c.title ?? '', content: c.content, emoji: c.emoji ?? '❓',
    })),
    activities: (s.activities ?? []).map((a) => withMeta('activities', {
      title: a.title, game_mode: a.game_mode,
    })),
    events: [],
  }
}

// ── Persistence ─────────────────────────────────────────────────────────────

function readLS(): DB | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch { /* unavailable or corrupt — fall through to seed */ }
  return null
}

function writeLS(next: DB): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* ignore quota/availability */ }
}

let db: DB = (() => {
  const existing = readLS()
  if (existing) return existing
  const seeded = buildSeededDB(seed as unknown as SeedShape)
  writeLS(seeded)
  return seeded
})()

function commit(next: DB): void {
  db = next
  writeLS(next)
}

// ── Pub/sub: table changes + broadcasts ─────────────────────────────────────

type DbListener = (payload: ChangePayload) => void
type BcListener = (payload: unknown) => void

const dbListeners: { table: TableName; cb: DbListener }[] = []
const bcListeners: { channel: string; event: string; cb: BcListener }[] = []

export function onDbChange(table: TableName, cb: DbListener): () => void {
  const entry = { table, cb }
  dbListeners.push(entry)
  return () => {
    const i = dbListeners.indexOf(entry)
    if (i >= 0) dbListeners.splice(i, 1)
  }
}

export function onBroadcast(channel: string, event: string, cb: BcListener): () => void {
  const entry = { channel, event, cb }
  bcListeners.push(entry)
  return () => {
    const i = bcListeners.indexOf(entry)
    if (i >= 0) bcListeners.splice(i, 1)
  }
}

function emitLocalDb(p: ChangePayload): void {
  for (const l of dbListeners) if (l.table === p.table) l.cb(p)
}

function emitLocalBroadcast(channel: string, event: string, payload: unknown): void {
  for (const l of bcListeners) if (l.channel === channel && l.event === event) l.cb(payload)
}

// ── Cross-window transport ──────────────────────────────────────────────────

type WireMsg =
  | { t: 'db'; payload: ChangePayload }
  | { t: 'bc'; channel: string; event: string; payload: unknown }

const bc: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null

if (bc) {
  bc.onmessage = (e: MessageEvent<WireMsg>) => {
    const msg = e.data
    if (msg.t === 'db') {
      // The sending window already wrote localStorage; re-read so our in-memory
      // copy matches, then notify local subscribers (which re-fetch).
      const fresh = readLS()
      if (fresh) db = fresh
      emitLocalDb(msg.payload)
    } else if (msg.t === 'bc') {
      emitLocalBroadcast(msg.channel, msg.event, msg.payload)
    }
  }
}

function post(msg: WireMsg): void { bc?.postMessage(msg) }

// A table change fires local listeners AND notifies other windows. Listeners
// re-fetch, so one representative row per mutation is enough — except that the
// game_config subscriber reads payload.new, and game_config is always a single
// row, so the representative is exactly the row it needs.
function fire(table: TableName, eventType: ChangeType, newRow: Row | null, oldRow: Row | null): void {
  const payload: ChangePayload = { eventType, table, new: newRow, old: oldRow }
  emitLocalDb(payload)
  post({ t: 'db', payload })
}

function applyFilter(row: Row, f: Filter): boolean {
  return f.op === 'eq' ? row[f.col] === f.val : row[f.col] !== f.val
}

// ── Read + mutate API (consumed by the supabase facade) ─────────────────────

export function getRows(table: TableName): Row[] {
  return db[table].map((r) => ({ ...r }))
}

export function insert(table: TableName, rows: Row | Row[]): void {
  const list = Array.isArray(rows) ? rows : [rows]
  if (!list.length) return
  const prepared = list.map((r) => withMeta(table, { ...r }))
  commit({ ...db, [table]: [...db[table], ...prepared] })
  fire(table, 'INSERT', prepared[prepared.length - 1], null)
}

export function update(table: TableName, filters: Filter[], patch: Row): void {
  let last: Row | null = null
  const nextRows = db[table].map((r) => {
    if (filters.every((f) => applyFilter(r, f))) {
      const merged = { ...r, ...patch }
      last = merged
      return merged
    }
    return r
  })
  if (!last) return
  commit({ ...db, [table]: nextRows })
  fire(table, 'UPDATE', last, null)
}

export function remove(table: TableName, filters: Filter[]): void {
  let last: Row | null = null
  const nextRows = db[table].filter((r) => {
    const hit = filters.every((f) => applyFilter(r, f))
    if (hit) { last = r; return false }
    return true
  })
  if (!last) return
  commit({ ...db, [table]: nextRows })
  fire(table, 'DELETE', null, last)
}

export function sendBroadcast(channel: string, event: string, payload: unknown): void {
  // Board and admin live in separate windows, so — like Supabase's default
  // (self: false) — a broadcast only crosses windows; it does not echo locally.
  post({ t: 'bc', channel, event, payload })
}

// Wipe back to the bundled demo seed and nudge every table to re-render.
export function resetToSeed(): void {
  const seeded = buildSeededDB(seed as unknown as SeedShape)
  commit(seeded)
  for (const table of ALL_TABLES) {
    fire(table, 'UPDATE', db[table][0] ?? null, null)
  }
}
