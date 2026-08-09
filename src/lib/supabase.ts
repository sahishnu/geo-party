// Supabase-compatible facade over the local, database-free store (./store).
//
// This intentionally keeps the export named `supabase` and mimics the exact
// subset of the supabase-js API the app uses — a chainable query builder
// (`.from().select().order().eq()...`) and channels (`.channel().on().subscribe()`
// / `.send()`) — so hooks and admin components need no changes. There is no
// network and no database; everything runs in the browser (see ./store).

import * as store from './store'
import type { Filter, Row, TableName } from './store'

interface Result {
  // `any` on purpose: the app's untouched hooks assign `.data` straight into
  // typed state, mirroring supabase-js's generic return.
  data: any // eslint-disable-line @typescript-eslint/no-explicit-any
  error: null
}

type Op = 'select' | 'insert' | 'update' | 'delete'

class Query implements PromiseLike<Result> {
  private filters: Filter[] = []
  private orderCol: string | null = null
  private ascending = true
  private limitN: number | null = null
  private singleRow = false

  constructor(private table: TableName, private op: Op, private data?: unknown) {}

  eq(col: string, val: unknown): this { this.filters.push({ op: 'eq', col, val }); return this }
  neq(col: string, val: unknown): this { this.filters.push({ op: 'neq', col, val }); return this }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col
    this.ascending = opts?.ascending !== false
    return this
  }
  limit(n: number): this { this.limitN = n; return this }
  single(): this { this.singleRow = true; return this }

  private run(): Result {
    switch (this.op) {
      case 'select': {
        let rows = store.getRows(this.table)
          .filter((r) => this.filters.every((f) => applyFilter(r, f)))
        if (this.orderCol) {
          const col = this.orderCol
          const dir = this.ascending ? 1 : -1
          rows = rows.slice().sort((a, b) => compare(a[col], b[col]) * dir)
        }
        if (this.limitN != null) rows = rows.slice(0, this.limitN)
        return { data: this.singleRow ? (rows[0] ?? null) : rows, error: null }
      }
      case 'insert':
        store.insert(this.table, this.data as Row | Row[])
        return { data: null, error: null }
      case 'update':
        store.update(this.table, this.filters, this.data as Row)
        return { data: null, error: null }
      case 'delete':
        store.remove(this.table, this.filters)
        return { data: null, error: null }
    }
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }
}

function applyFilter(row: Row, f: Filter): boolean {
  return f.op === 'eq' ? row[f.col] === f.val : row[f.col] !== f.val
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

// ── Channels ────────────────────────────────────────────────────────────────

class Channel {
  private unsubs: (() => void)[] = []
  constructor(private name: string) {}

  // Table-change subscription: `.on('postgres_changes', { table }, cb)`.
  on(
    type: 'postgres_changes',
    opts: { event?: string; schema?: string; table: string },
    cb: (payload: any) => void, // eslint-disable-line @typescript-eslint/no-explicit-any
  ): this
  // Broadcast subscription: `.on('broadcast', { event }, cb)`.
  on(
    type: 'broadcast',
    opts: { event: string },
    cb: (msg: { payload: any }) => void, // eslint-disable-line @typescript-eslint/no-explicit-any
  ): this
  on(
    type: 'postgres_changes' | 'broadcast',
    opts: { event?: string; schema?: string; table?: string },
    cb: (arg: any) => void, // eslint-disable-line @typescript-eslint/no-explicit-any
  ): this {
    if (type === 'postgres_changes') {
      this.unsubs.push(store.onDbChange(opts.table as TableName, cb))
    } else {
      const event = opts.event as string
      this.unsubs.push(store.onBroadcast(this.name, event, (payload) => cb({ payload })))
    }
    return this
  }

  // supabase-js calls the status callback with 'SUBSCRIBED' once connected;
  // locally we're always "connected".
  subscribe(statusCb?: (status: string) => void): this {
    if (statusCb) statusCb('SUBSCRIBED')
    return this
  }

  async send(msg: { type: string; event: string; payload: unknown }): Promise<void> {
    store.sendBroadcast(this.name, msg.event, msg.payload)
  }

  teardown(): void {
    this.unsubs.forEach((u) => u())
    this.unsubs = []
  }
}

export const supabase = {
  from(table: TableName) {
    return {
      select: (_columns = '*') => new Query(table, 'select'),
      insert: (rows: unknown) => new Query(table, 'insert', rows),
      update: (patch: unknown) => new Query(table, 'update', patch),
      delete: () => new Query(table, 'delete'),
    }
  },
  channel(name: string): Channel {
    return new Channel(name)
  },
  removeChannel(channel: Channel): void {
    channel.teardown()
  },
}
