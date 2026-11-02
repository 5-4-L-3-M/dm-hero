import { getDb } from '../../utils/db'
import { requireCampaign } from '../../utils/storyBoard'
import { bookFor, ensureRosterPlace, entityOfType, loadRoster, rosterBooks } from '../../utils/roster'
import { categoryByName, setLocationCategory } from '../../utils/places'

/**
 * Roster endpoints (mounted under /api/roster):
 *   GET    ?campaignId[&locationId|&npcId]   places + roles (filtered for side panels)
 *   POST   places          { campaignId, location_id, category? }   put a place on the roster
 *   PATCH  places/:id      { category?, sort_order? }               (:id = location id)
 *   DELETE places/:id      takes the place and its roles off the roster (NPCs stay)
 *   POST   roles           { campaignId, location_id, role, npc_id?, note? }
 *   PATCH  roles/:id       { role?, npc_id?, note? }
 *   DELETE roles/:id
 *   POST   order           { campaignId, location_id, role_ids }  |  { campaignId, places: [location ids] }
 */
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const roleRow = (id: number) => getDb().prepare('SELECT id, campaign_id, location_id FROM roster_roles WHERE id = ?').get(id) as { id: number, campaign_id: number, location_id: number } | undefined

function roleById(campaignId: number, id: number) {
  return loadRoster(getDb(), campaignId).roles.find(r => r.id === id) ?? null
}

export const getRoster = defineEventHandler((event) => {
  const db = getDb()
  const q = getQuery(event)
  const campaignId = requireCampaign(db, q.campaignId)
  return loadRoster(db, campaignId, { locationId: Number(q.locationId) || undefined, npcId: Number(q.npcId) || undefined })
})

export const addPlace = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const loc = entityOfType(db, campaignId, body.location_id, 'Location') ?? entityOfType(db, campaignId, body.location_id, 'Faction')
  if (!loc) throw createError({ statusCode: 400, message: 'Unknown place' })
  ensureRosterPlace(db, campaignId, loc, text(body.category), body.book_id ?? null)
  return loadRoster(db, campaignId).places.find(p => p.location_id === loc)
})

export const updatePlace = defineEventHandler(async (event) => {
  const db = getDb()
  const locationId = Number(getRouterParam(event, 'id'))
  const row = db.prepare('SELECT campaign_id, category, sort_order FROM roster_places WHERE location_id = ?').get(locationId) as { campaign_id: number, category: string | null, sort_order: number } | undefined
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  // For a place, the heading is its place category (shared with the maps)
  if (has('category') && entityOfType(db, row.campaign_id, locationId, 'Location')) {
    const name = text(body.category)
    setLocationCategory(db, row.campaign_id, locationId, name ? categoryByName(db, row.campaign_id, name, true) : null)
  }
  db.prepare('UPDATE roster_places SET category = ?, sort_order = ? WHERE location_id = ? AND campaign_id = ?').run(
    has('category') ? text(body.category) : row.category,
    has('sort_order') ? Number(body.sort_order) || 0 : row.sort_order,
    locationId,
    row.campaign_id,
  )
  // Move to another roster
  if (has('book_id')) db.prepare('UPDATE roster_places SET book_id = ? WHERE location_id = ? AND campaign_id = ?').run(bookFor(db, row.campaign_id, body.book_id), locationId, row.campaign_id)
  return loadRoster(db, row.campaign_id).places.find(p => p.location_id === locationId)
})

export const removePlace = defineEventHandler((event) => {
  const db = getDb()
  const locationId = Number(getRouterParam(event, 'id'))
  const row = db.prepare('SELECT campaign_id FROM roster_places WHERE location_id = ?').get(locationId) as { campaign_id: number } | undefined
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  db.transaction(() => {
    db.prepare('DELETE FROM roster_roles WHERE location_id = ? AND campaign_id = ?').run(locationId, row.campaign_id)
    db.prepare('DELETE FROM roster_places WHERE location_id = ? AND campaign_id = ?').run(locationId, row.campaign_id)
  })()
  return { ok: true }
})

export const addRole = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const loc = entityOfType(db, campaignId, body.location_id, 'Location') ?? entityOfType(db, campaignId, body.location_id, 'Faction')
  const role = text(body.role)
  if (!loc || !role) throw createError({ statusCode: 400, message: 'A place and a role name are needed' })
  ensureRosterPlace(db, campaignId, loc, null, body.book_id ?? null)
  const order = (db.prepare('SELECT MAX(sort_order) AS m FROM roster_roles WHERE location_id = ?').get(loc) as { m: number | null }).m ?? -1
  const r = db.prepare('INSERT INTO roster_roles (campaign_id, location_id, role, npc_id, note, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(campaignId, loc, role, entityOfType(db, campaignId, body.npc_id, 'NPC'), text(body.note), order + 1)
  return roleById(campaignId, Number(r.lastInsertRowid))
})

export const updateRole = defineEventHandler(async (event) => {
  const db = getDb()
  const row = roleRow(Number(getRouterParam(event, 'id')))
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const cur = db.prepare('SELECT role, npc_id, note FROM roster_roles WHERE id = ?').get(row.id) as { role: string, npc_id: number | null, note: string | null }
  db.prepare('UPDATE roster_roles SET role = ?, npc_id = ?, note = ? WHERE id = ?').run(
    has('role') ? text(body.role) ?? cur.role : cur.role,
    has('npc_id') ? entityOfType(db, row.campaign_id, body.npc_id, 'NPC') : cur.npc_id,
    has('note') ? text(body.note) : cur.note,
    row.id,
  )
  return roleById(row.campaign_id, row.id)
})

export const removeRole = defineEventHandler((event) => {
  const db = getDb()
  const row = roleRow(Number(getRouterParam(event, 'id')))
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  db.prepare('DELETE FROM roster_roles WHERE id = ?').run(row.id)
  return { ok: true }
})

export const saveOrder = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{ campaignId: number, location_id?: number, role_ids?: number[], places?: number[] }>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  db.transaction(() => {
    if (Array.isArray(body.role_ids)) {
      const set = db.prepare('UPDATE roster_roles SET sort_order = ? WHERE id = ? AND campaign_id = ? AND location_id = ?')
      body.role_ids.forEach((id, i) => set.run(i, Number(id), campaignId, Number(body.location_id)))
    }
    if (Array.isArray(body.places)) {
      const set = db.prepare('UPDATE roster_places SET sort_order = ? WHERE location_id = ? AND campaign_id = ?')
      body.places.forEach((id, i) => set.run(i, Number(id), campaignId))
    }
  })()
  return { ok: true }
})

// --- rosters (one per city or region) ------------------------------------------
export const addBook = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{ campaignId: number, name: string }>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const name = text(body.name)
  if (!name) throw createError({ statusCode: 400, message: 'A name is needed' })
  rosterBooks(db, campaignId)
  const order = (db.prepare('SELECT MAX(sort_order) AS m FROM roster_books WHERE campaign_id = ?').get(campaignId) as { m: number | null }).m ?? -1
  const id = Number(db.prepare('INSERT INTO roster_books (campaign_id, name, sort_order) VALUES (?, ?, ?)').run(campaignId, name.slice(0, 80), order + 1).lastInsertRowid)
  return rosterBooks(db, campaignId).find(b => b.id === id)
})

const bookRow = (id: number) => getDb().prepare('SELECT id, campaign_id FROM roster_books WHERE id = ?').get(id) as { id: number, campaign_id: number } | undefined

export const updateBook = defineEventHandler(async (event) => {
  const db = getDb()
  const row = bookRow(Number(getRouterParam(event, 'id')))
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  const body = await readBody<{ name?: string, sort_order?: number }>(event) ?? {}
  if (text(body.name)) db.prepare('UPDATE roster_books SET name = ? WHERE id = ?').run(text(body.name)!.slice(0, 80), row.id)
  if (body.sort_order !== undefined) db.prepare('UPDATE roster_books SET sort_order = ? WHERE id = ?').run(Number(body.sort_order) || 0, row.id)
  return rosterBooks(db, row.campaign_id).find(b => b.id === row.id)
})

/** Deleting a roster moves its places to another one (the last roster can't go) */
export const removeBook = defineEventHandler((event) => {
  const db = getDb()
  const row = bookRow(Number(getRouterParam(event, 'id')))
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  const other = rosterBooks(db, row.campaign_id).find(b => b.id !== row.id)
  if (!other) throw createError({ statusCode: 400, message: 'The last roster can\'t be deleted' })
  db.transaction(() => {
    db.prepare('UPDATE roster_places SET book_id = ? WHERE book_id = ?').run(other.id, row.id)
    db.prepare('DELETE FROM roster_books WHERE id = ?').run(row.id)
  })()
  return { ok: true, moved_to: other.id }
})
