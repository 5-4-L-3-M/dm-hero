import { getDb } from '../../../utils/db'
import { entityInCampaign, requireCampaign } from '../../../utils/storyBoard'

/** PUT /api/story/places/:id { campaignId, note } — the place kit's table note (empty clears it). */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{ campaignId: number, note?: string | null }>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const id = entityInCampaign(db, campaignId, getRouterParam(event, 'id'), 'Location')
  if (!id) throw createError({ statusCode: 404, message: 'Location not found' })
  const note = typeof body.note === 'string' && body.note.trim() ? body.note : null
  if (note) {
    db.prepare(`INSERT INTO story_place_kits (campaign_id, location_id, note) VALUES (?, ?, ?)
      ON CONFLICT(campaign_id, location_id) DO UPDATE SET note = excluded.note, updated_at = CURRENT_TIMESTAMP`).run(campaignId, id, note)
  }
  else {
    db.prepare('DELETE FROM story_place_kits WHERE campaign_id = ? AND location_id = ?').run(campaignId, id)
  }
  return { id, note }
})
