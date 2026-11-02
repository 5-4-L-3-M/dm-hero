import type Database from 'better-sqlite3'
import { cleanColumns, type RollTable, type RollTableRow, type RollTableTag } from '../../types/rollTable'

interface TableRow { id: number, name: string, category: string | null, description: string | null, dice: string | null, columns: string | null, updated_at: string }

function readColumns(raw: string | null): string[] {
  try {
    return cleanColumns(raw ? JSON.parse(raw) : [])
  }
  catch {
    return []
  }
}

function tagsOf(db: Database.Database, tableIds: number[]): Map<number, RollTableTag[]> {
  const out = new Map<number, RollTableTag[]>()
  if (!tableIds.length) return out
  const q = tableIds.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT t.table_id, t.kind, t.ref_id,
      CASE WHEN t.kind = 'session' THEN COALESCE(s.title, 'Session') ELSE e.name END AS name,
      CASE WHEN t.kind = 'session' THEN 'Session' ELSE et.name END AS type,
      s.session_number
    FROM roll_table_tags t
    LEFT JOIN entities e ON t.kind = 'entity' AND e.id = t.ref_id AND e.deleted_at IS NULL
    LEFT JOIN entity_types et ON et.id = e.type_id
    LEFT JOIN sessions s ON t.kind = 'session' AND s.id = t.ref_id
    WHERE t.table_id IN (${q})
  `).all(...tableIds) as Array<RollTableTag & { table_id: number, session_number: number | null }>
  for (const r of rows) {
    if (!r.name) continue
    const list = out.get(r.table_id) ?? []
    list.push({ kind: r.kind, ref_id: r.ref_id, type: r.type, name: r.kind === 'session' && r.session_number ? `#${r.session_number} ${r.name}` : r.name })
    out.set(r.table_id, list)
  }
  return out
}

function rowsOf(db: Database.Database, tableIds: number[]): Map<number, RollTableRow[]> {
  const out = new Map<number, RollTableRow[]>()
  if (!tableIds.length) return out
  const rows = db.prepare(`SELECT id, table_id, min, max, result FROM roll_table_rows WHERE table_id IN (${tableIds.map(() => '?').join(',')}) ORDER BY sort_order, min, id`)
    .all(...tableIds) as Array<RollTableRow & { table_id: number }>
  for (const { table_id, ...r } of rows) out.set(table_id, [...(out.get(table_id) ?? []), r])
  return out
}

/** All the campaign's tables, or only those tagged to one entity / session */
export function listRollTables(db: Database.Database, campaignId: number, filter?: { kind: 'entity' | 'session', refId: number }): RollTable[] {
  const base = db.prepare(`
    SELECT id, name, category, description, dice, columns, updated_at FROM roll_tables r
    WHERE campaign_id = ? ${filter ? 'AND EXISTS (SELECT 1 FROM roll_table_tags t WHERE t.table_id = r.id AND t.kind = ? AND t.ref_id = ?)' : ''}
    ORDER BY category IS NULL, category COLLATE NOCASE, sort_order, name COLLATE NOCASE
  `).all(...(filter ? [campaignId, filter.kind, filter.refId] : [campaignId])) as TableRow[]
  const ids = base.map(t => t.id)
  const rows = rowsOf(db, ids)
  const tags = tagsOf(db, ids)
  return base.map(t => ({ ...t, columns: readColumns(t.columns), rows: rows.get(t.id) ?? [], tags: tags.get(t.id) ?? [] }))
}

export function getRollTable(db: Database.Database, id: number): (RollTable & { campaign_id: number }) | null {
  const t = db.prepare('SELECT id, campaign_id, name, category, description, dice, columns, updated_at FROM roll_tables WHERE id = ?').get(id) as (TableRow & { campaign_id: number }) | undefined
  if (!t) return null
  return { ...t, columns: readColumns(t.columns), rows: rowsOf(db, [id]).get(id) ?? [], tags: tagsOf(db, [id]).get(id) ?? [] }
}

export interface RollTableInput {
  name?: string
  category?: string | null
  description?: string | null
  dice?: string | null
  columns?: string[] | string | null
  rows?: RollTableRow[]
  tags?: Array<{ kind: 'entity' | 'session', ref_id: number }>
}

const text = (v: unknown, max = 2000) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

/** Create (id = null) or update a table; rows and tags are replaced when sent */
export function saveRollTable(db: Database.Database, campaignId: number, id: number | null, input: RollTableInput): number {
  return db.transaction(() => {
    let tableId = id
    if (!tableId) {
      const name = text(input.name, 200)
      if (!name) throw createError({ statusCode: 400, message: 'A name is required' })
      const cols = cleanColumns(input.columns)
      tableId = Number(db.prepare('INSERT INTO roll_tables (campaign_id, name, category, description, dice, columns) VALUES (?, ?, ?, ?, ?, ?)')
        .run(campaignId, name, text(input.category, 80), text(input.description), text(input.dice, 20), cols.length ? JSON.stringify(cols) : null).lastInsertRowid)
    }
    else {
      const sets: string[] = []
      const vals: unknown[] = []
      if (input.name !== undefined) {
        const name = text(input.name, 200)
        if (!name) throw createError({ statusCode: 400, message: 'A name is required' })
        sets.push('name = ?')
        vals.push(name)
      }
      const set = (col: string, v: unknown) => {
        sets.push(`${col} = ?`)
        vals.push(v)
      }
      if (input.category !== undefined) set('category', text(input.category, 80))
      if (input.description !== undefined) set('description', text(input.description))
      if (input.dice !== undefined) set('dice', text(input.dice, 20))
      if (input.columns !== undefined) set('columns', cleanColumns(input.columns).length ? JSON.stringify(cleanColumns(input.columns)) : null)
      db.prepare(`UPDATE roll_tables SET ${[...sets, 'updated_at = CURRENT_TIMESTAMP'].join(', ')} WHERE id = ?`).run(...vals, tableId)
    }
    if (Array.isArray(input.rows)) {
      db.prepare('DELETE FROM roll_table_rows WHERE table_id = ?').run(tableId)
      const ins = db.prepare('INSERT INTO roll_table_rows (table_id, min, max, result, sort_order) VALUES (?, ?, ?, ?, ?)')
      input.rows.forEach((r, i) => {
        const result = text(r.result, 2000)
        const min = Math.round(Number(r.min))
        const max = Math.round(Number(r.max ?? r.min))
        if (result && Number.isFinite(min) && Number.isFinite(max)) ins.run(tableId, Math.min(min, max), Math.max(min, max), result, i)
      })
    }
    if (Array.isArray(input.tags)) {
      db.prepare('DELETE FROM roll_table_tags WHERE table_id = ?').run(tableId)
      const ins = db.prepare('INSERT OR IGNORE INTO roll_table_tags (table_id, kind, ref_id) VALUES (?, ?, ?)')
      for (const t of input.tags) {
        const ref = Number(t.ref_id)
        if (!ref) continue
        if (t.kind === 'session' && db.prepare('SELECT 1 FROM sessions WHERE id = ? AND campaign_id = ?').get(ref, campaignId)) ins.run(tableId, 'session', ref)
        if (t.kind === 'entity' && db.prepare('SELECT 1 FROM entities WHERE id = ? AND campaign_id = ?').get(ref, campaignId)) ins.run(tableId, 'entity', ref)
      }
    }
    return tableId
  })()
}
