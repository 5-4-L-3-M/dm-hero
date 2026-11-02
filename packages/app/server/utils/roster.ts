import type Database from 'better-sqlite3'
import { readLoyalty } from '../../types/npc'
import { placeCategoryNames } from './places'
import { SETTLEMENT_TYPES, type Roster, type RosterBook, type RosterNpc, type RosterPlace, type RosterRole } from '../../types/roster'

function meta(raw: string | null): Record<string, unknown> {
  try {
    const v = raw ? JSON.parse(raw) : null
    return v && typeof v === 'object' ? v as Record<string, unknown> : {}
  }
  catch {
    return {}
  }
}

/** An entity of this campaign and type (not deleted), or null */
export function entityOfType(db: Database.Database, campaignId: number, id: unknown, type: 'Location' | 'NPC' | 'Faction'): number | null {
  if (id === null || id === undefined || id === '') return null
  const row = db.prepare(`
    SELECT e.id FROM entities e JOIN entity_types et ON et.id = e.type_id
    WHERE e.id = ? AND e.campaign_id = ? AND et.name = ? AND e.deleted_at IS NULL
  `).get(Number(id), campaignId, type) as { id: number } | undefined
  return row?.id ?? null
}

/** The campaign's rosters (a first one is made when there's none) */
export function rosterBooks(db: Database.Database, campaignId: number): RosterBook[] {
  let books = db.prepare('SELECT id, name, sort_order FROM roster_books WHERE campaign_id = ? ORDER BY sort_order, id').all(campaignId) as RosterBook[]
  if (!books.length) {
    db.prepare('INSERT INTO roster_books (campaign_id, name) VALUES (?, ?)').run(campaignId, 'Main roster')
    books = db.prepare('SELECT id, name, sort_order FROM roster_books WHERE campaign_id = ? ORDER BY sort_order, id').all(campaignId) as RosterBook[]
  }
  return books
}

/** A roster of this campaign, or its first one */
export function bookFor(db: Database.Database, campaignId: number, bookId?: unknown): number {
  const books = rosterBooks(db, campaignId)
  return books.find(b => b.id === Number(bookId))?.id ?? books[0]!.id
}

/** Make sure a place is on the roster (new ones go last in their category) */
export function ensureRosterPlace(db: Database.Database, campaignId: number, locationId: number, category?: string | null, bookId?: unknown) {
  const order = (db.prepare('SELECT MAX(sort_order) AS m FROM roster_places WHERE campaign_id = ?').get(campaignId) as { m: number | null }).m ?? -1
  // A place already on a roster stays there unless a roster is named
  const book = bookId !== undefined && bookId !== null ? bookFor(db, campaignId, bookId) : null
  db.prepare(`
    INSERT INTO roster_places (campaign_id, location_id, category, sort_order, book_id) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(campaign_id, location_id) DO UPDATE SET category = COALESCE(excluded.category, roster_places.category),
      book_id = COALESCE(?, roster_places.book_id)
  `).run(campaignId, locationId, category?.trim() || null, order + 1, book ?? bookFor(db, campaignId), book)
}

/** The whole roster, or only the roles of one place / one NPC (for side panels). */
export function loadRoster(db: Database.Database, campaignId: number, filter: { locationId?: number, npcId?: number } = {}): Roster {
  // Places — and factions, for guilds and groups without a building of their own
  const locs = db.prepare(`
    SELECT e.id, e.name, e.image_url, e.metadata, e.parent_entity_id, et.name AS kind
    FROM entities e JOIN entity_types et ON et.id = e.type_id
    WHERE e.campaign_id = ? AND et.name IN ('Location', 'Faction') AND e.deleted_at IS NULL
  `).all(campaignId) as Array<{ id: number, name: string, image_url: string | null, metadata: string | null, parent_entity_id: number | null, kind: 'Location' | 'Faction' }>
  const categoryNames = placeCategoryNames(db, campaignId)
  const byId = new Map(locs.map(l => [l.id, l]))
  const typeOf = (l: { metadata: string | null }) => {
    const t = meta(l.metadata).type
    return typeof t === 'string' ? t : null
  }
  // Nearest city / town / village above (or the top-most place)
  function settlementOf(id: number): { id: number, name: string } | null {
    let cur = byId.get(id)
    let top: typeof cur = undefined
    const seen = new Set<number>()
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id)
      if (cur.id !== id && SETTLEMENT_TYPES.includes(typeOf(cur) ?? '')) return { id: cur.id, name: cur.name }
      top = cur
      cur = cur.parent_entity_id ? byId.get(cur.parent_entity_id) : undefined
    }
    return top && top.id !== id ? { id: top.id, name: top.name } : null
  }

  const books = rosterBooks(db, campaignId)
  const placeRows = db.prepare('SELECT location_id, category, sort_order, book_id FROM roster_places WHERE campaign_id = ? ORDER BY sort_order, id').all(campaignId) as Array<{ location_id: number, category: string | null, sort_order: number, book_id: number | null }>
  const places: RosterPlace[] = placeRows.flatMap((p) => {
    const l = byId.get(p.location_id)
    if (!l) return []
    const s = l.kind === 'Location' ? settlementOf(l.id) : null
    // A place's heading is its place category; factions keep the roster heading
    const category = (l.kind === 'Location' ? categoryNames.get(l.id) : null) ?? p.category
    return [{ location_id: l.id, kind: l.kind, name: l.name, image_url: l.image_url, type: l.kind === 'Location' ? typeOf(l) : null, category, sort_order: p.sort_order, settlement_id: s?.id ?? null, settlement_name: s?.name ?? null, book_id: books.some(b => b.id === p.book_id) ? p.book_id : books[0]!.id }]
  })

  const where = filter.locationId ? 'AND r.location_id = ?' : filter.npcId ? 'AND r.npc_id = ?' : ''
  const params: number[] = [campaignId]
  if (filter.locationId) params.push(filter.locationId)
  else if (filter.npcId) params.push(filter.npcId)
  const roleRows = db.prepare(`
    SELECT r.id, r.location_id, r.role, r.note, r.sort_order,
           n.id AS npc_id, n.name AS npc_name, n.image_url AS npc_image, n.metadata AS npc_meta
    FROM roster_roles r
    LEFT JOIN entities n ON n.id = r.npc_id AND n.deleted_at IS NULL
    WHERE r.campaign_id = ? ${where}
    ORDER BY r.location_id, r.sort_order, r.id
  `).all(...params) as Array<{ id: number, location_id: number, role: string, note: string | null, sort_order: number, npc_id: number | null, npc_name: string | null, npc_image: string | null, npc_meta: string | null }>

  const roles: RosterRole[] = roleRows.flatMap((r) => {
    const l = byId.get(r.location_id)
    if (!l) return []
    let npc: RosterNpc | null = null
    if (r.npc_id) {
      const m = meta(r.npc_meta)
      npc = {
        id: r.npc_id,
        name: r.npc_name ?? '',
        image_url: r.npc_image,
        race: typeof m.race === 'string' ? m.race : null,
        age: Number.isFinite(Number(m.age)) && m.age !== null && m.age !== '' ? Number(m.age) : null,
        age_human: m.age_human !== undefined && m.age_human !== null && m.age_human !== '' ? String(m.age_human) : null,
        loyalty: readLoyalty(m.loyalty),
      }
    }
    return [{ id: r.id, location_id: r.location_id, location_name: l.name, role: r.role, note: r.note, sort_order: r.sort_order, npc }]
  })

  return { books, places: filter.locationId || filter.npcId ? places.filter(p => roles.some(r => r.location_id === p.location_id)) : places, roles }
}
