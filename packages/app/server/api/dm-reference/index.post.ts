import { getDb } from '~~/server/utils/db'

/** Add a section to the end of the DM Screen. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ campaignId?: number, title?: string, body?: string, icon?: string }>(event)
  const campaignId = Number(body?.campaignId)
  const title = String(body?.title ?? '').trim().slice(0, 200)
  if (!campaignId || !title) throw createError({ statusCode: 400, message: 'Campaign and title are required' })
  const db = getDb()
  const next = (db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM dm_reference_sections WHERE campaign_id = ?').get(campaignId) as { n: number }).n
  const id = db.prepare('INSERT INTO dm_reference_sections (campaign_id, title, icon, body, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(campaignId, title, body?.icon || null, String(body?.body ?? ''), next).lastInsertRowid
  return db.prepare('SELECT id, title, icon, body, sort_order FROM dm_reference_sections WHERE id = ?').get(id)
})
