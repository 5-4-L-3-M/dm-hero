import { getDb } from '~~/server/utils/db'
import { DM_REFERENCE_SEED } from '~~/server/utils/dmReferenceSeed'

/** DM Screen sections for a campaign. An empty screen gets the starter sections. */
export default defineEventHandler((event) => {
  const campaignId = Number(getQuery(event).campaignId)
  if (!campaignId) throw createError({ statusCode: 400, message: 'Campaign ID is required' })
  const db = getDb()
  const list = () => db.prepare('SELECT id, title, icon, body, sort_order FROM dm_reference_sections WHERE campaign_id = ? ORDER BY sort_order, id').all(campaignId)
  let rows = list()
  if (!rows.length) {
    const ins = db.prepare('INSERT INTO dm_reference_sections (campaign_id, title, icon, body, sort_order) VALUES (?, ?, ?, ?, ?)')
    db.transaction(() => DM_REFERENCE_SEED.forEach((s, i) => ins.run(campaignId, s.title, s.icon, s.body, i)))()
    rows = list()
  }
  return rows
})
