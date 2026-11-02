import type Database from 'better-sqlite3'
import { DEFAULT_PLACE_CATEGORIES, type PlaceCategories, type PlaceCategory } from '../../types/places'

function typeOf(raw: string | null): string | null {
  try {
    const t = raw ? JSON.parse(raw)?.type : null
    return typeof t === 'string' ? t : null
  }
  catch {
    return null
  }
}

/**
 * First use in a campaign: create the default categories, plus any roster
 * headings that aren't one of them, and file roster places under their heading.
 */
export function ensurePlaceCategories(db: Database.Database, campaignId: number) {
  const has = db.prepare('SELECT 1 FROM place_categories WHERE campaign_id = ? LIMIT 1').get(campaignId)
  if (has) return
  db.transaction(() => {
    const insert = db.prepare('INSERT INTO place_categories (campaign_id, name, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)')
    DEFAULT_PLACE_CATEGORIES.forEach((c, i) => insert.run(campaignId, c.name, c.color, c.icon, i))
    const headings = db.prepare(`
      SELECT rp.location_id, rp.category FROM roster_places rp
      JOIN entities e ON e.id = rp.location_id JOIN entity_types et ON et.id = e.type_id AND et.name = 'Location'
      WHERE rp.campaign_id = ? AND rp.category IS NOT NULL
    `).all(campaignId) as Array<{ location_id: number, category: string }>
    for (const h of headings) {
      const id = categoryByName(db, campaignId, h.category, true)!
      db.prepare('INSERT OR REPLACE INTO location_categories (location_id, campaign_id, category_id) VALUES (?, ?, ?)').run(h.location_id, campaignId, id)
    }
  })()
}

/** A category id by name (case-insensitive); create it if asked */
export function categoryByName(db: Database.Database, campaignId: number, name: string, create = false): number | null {
  const clean = name.trim()
  if (!clean) return null
  const row = db.prepare('SELECT id FROM place_categories WHERE campaign_id = ? AND lower(name) = lower(?)').get(campaignId, clean) as { id: number } | undefined
  if (row || !create) return row?.id ?? null
  const order = (db.prepare('SELECT MAX(sort_order) AS m FROM place_categories WHERE campaign_id = ?').get(campaignId) as { m: number | null }).m ?? -1
  return Number(db.prepare('INSERT INTO place_categories (campaign_id, name, sort_order) VALUES (?, ?, ?)').run(campaignId, clean, order + 1).lastInsertRowid)
}

export function loadPlaceCategories(db: Database.Database, campaignId: number): PlaceCategories {
  ensurePlaceCategories(db, campaignId)
  const categories = db.prepare('SELECT id, name, color, icon, sort_order FROM place_categories WHERE campaign_id = ? ORDER BY sort_order, id').all(campaignId) as PlaceCategory[]
  const byName = new Map(categories.map(c => [c.name.toLowerCase(), c.id]))
  const guess = new Map<string, number>()
  for (const d of DEFAULT_PLACE_CATEGORIES) {
    const id = byName.get(d.name.toLowerCase())
    if (id) for (const t of d.types) guess.set(t, id)
  }
  const explicit = new Map((db.prepare('SELECT location_id, category_id FROM location_categories WHERE campaign_id = ?').all(campaignId) as Array<{ location_id: number, category_id: number }>).map(r => [r.location_id, r.category_id]))
  const locs = db.prepare(`
    SELECT e.id, e.metadata FROM entities e JOIN entity_types et ON et.id = e.type_id
    WHERE e.campaign_id = ? AND et.name = 'Location' AND e.deleted_at IS NULL
  `).all(campaignId) as Array<{ id: number, metadata: string | null }>
  return {
    categories,
    locations: locs.map((l) => {
      const set = explicit.get(l.id)
      if (set) return { id: l.id, category_id: set, explicit: true }
      const t = typeOf(l.metadata)
      return { id: l.id, category_id: t ? guess.get(t) ?? null : null, explicit: false }
    }),
  }
}

/** The category a place ends up in (name), for roster headings */
export function placeCategoryNames(db: Database.Database, campaignId: number): Map<number, string> {
  const pc = loadPlaceCategories(db, campaignId)
  const names = new Map(pc.categories.map(c => [c.id, c.name]))
  const out = new Map<number, string>()
  for (const l of pc.locations) if (l.category_id && names.has(l.category_id)) out.set(l.id, names.get(l.category_id)!)
  return out
}

export function setLocationCategory(db: Database.Database, campaignId: number, locationId: number, categoryId: number | null) {
  if (categoryId) db.prepare('INSERT OR REPLACE INTO location_categories (location_id, campaign_id, category_id) VALUES (?, ?, ?)').run(locationId, campaignId, categoryId)
  else db.prepare('DELETE FROM location_categories WHERE location_id = ? AND campaign_id = ?').run(locationId, campaignId)
}
