import { getDb } from '../utils/db'
import { requireCampaign } from '../utils/storyBoard'
import { categoryByName, loadPlaceCategories, setLocationCategory } from '../utils/places'

/**
 * Place categories (mounted under /api/places):
 *   GET    ?campaignId                      categories + each place's category
 *   POST   categories      { campaignId, name, color?, icon? }
 *   PATCH  categories/:id  { name?, color?, icon?, sort_order? }
 *   DELETE categories/:id  (its places fall back to the guess from their type)
 *   PUT    location        { campaignId, location_id, category_id | null, category_name? }
 */
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const HEX = /^#[0-9a-f]{6}$/i

function categoryRow(id: number) {
  return getDb().prepare('SELECT id, campaign_id, name, color, icon, sort_order FROM place_categories WHERE id = ?').get(id) as { id: number, campaign_id: number, name: string, color: string, icon: string, sort_order: number } | undefined
}

export const getPlaces = defineEventHandler((event) => {
  const db = getDb()
  return loadPlaceCategories(db, requireCampaign(db, getQuery(event).campaignId))
})

export const addCategory = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const name = text(body.name)
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })
  const id = categoryByName(db, campaignId, name, true)!
  db.prepare('UPDATE place_categories SET color = COALESCE(?, color), icon = COALESCE(?, icon) WHERE id = ?')
    .run(typeof body.color === 'string' && HEX.test(body.color) ? body.color : null, text(body.icon), id)
  return categoryRow(id)
})

export const updateCategory = defineEventHandler(async (event) => {
  const db = getDb()
  const cur = categoryRow(Number(getRouterParam(event, 'id')))
  if (!cur) throw createError({ statusCode: 404, message: 'Not found' })
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  db.prepare('UPDATE place_categories SET name = ?, color = ?, icon = ?, sort_order = ? WHERE id = ?').run(
    text(body.name) ?? cur.name,
    typeof body.color === 'string' && HEX.test(body.color) ? body.color : cur.color,
    text(body.icon) ?? cur.icon,
    body.sort_order !== undefined ? Number(body.sort_order) || 0 : cur.sort_order,
    cur.id,
  )
  return categoryRow(cur.id)
})

export const removeCategory = defineEventHandler((event) => {
  const db = getDb()
  const cur = categoryRow(Number(getRouterParam(event, 'id')))
  if (!cur) throw createError({ statusCode: 404, message: 'Not found' })
  db.prepare('DELETE FROM place_categories WHERE id = ?').run(cur.id)
  return { ok: true }
})

export const setLocation = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const loc = db.prepare(`
    SELECT e.id FROM entities e JOIN entity_types et ON et.id = e.type_id
    WHERE e.id = ? AND e.campaign_id = ? AND et.name = 'Location' AND e.deleted_at IS NULL
  `).get(Number(body.location_id), campaignId) as { id: number } | undefined
  if (!loc) throw createError({ statusCode: 400, message: 'Unknown place' })
  let categoryId = Number(body.category_id) || null
  if (!categoryId && text(body.category_name)) categoryId = categoryByName(db, campaignId, String(body.category_name), true)
  if (categoryId && !db.prepare('SELECT 1 FROM place_categories WHERE id = ? AND campaign_id = ?').get(categoryId, campaignId)) throw createError({ statusCode: 400, message: 'Unknown category' })
  setLocationCategory(db, campaignId, loc.id, categoryId)
  return loadPlaceCategories(db, campaignId).locations.find(l => l.id === loc.id)
})
