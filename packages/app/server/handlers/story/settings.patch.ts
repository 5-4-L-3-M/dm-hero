import { getDb } from '../../utils/db'
import { entityInCampaign, getSettings, requireCampaign } from '../../utils/storyBoard'
import { COLOR_BY, oneOf } from '../../../types/story'

/** PATCH /api/story/settings { campaignId, color_by?, party_location_id? } */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{ campaignId: number, color_by?: string, party_location_id?: number | null }>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const current = getSettings(db, campaignId)
  const colorBy = body.color_by !== undefined ? oneOf(COLOR_BY, body.color_by, current.color_by) : current.color_by
  const party = body.party_location_id !== undefined
    ? entityInCampaign(db, campaignId, body.party_location_id, 'Location')
    : current.party_location_id
  db.prepare(`
    INSERT INTO story_board_settings (campaign_id, color_by, party_location_id) VALUES (?, ?, ?)
    ON CONFLICT(campaign_id) DO UPDATE SET color_by = excluded.color_by, party_location_id = excluded.party_location_id
  `).run(campaignId, colorBy, party)
  return getSettings(db, campaignId)
})
