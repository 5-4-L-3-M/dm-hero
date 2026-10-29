import { getDb } from '../../utils/db'
import { entityInCampaign, getSettings, requireCampaign } from '../../utils/storyBoard'
import { COLOR_BY, GROUP_BY, oneOf } from '../../../types/story'

/** PATCH /api/story/settings { campaignId, color_by?, party_location_id?, group_by?, compact? } */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{ campaignId: number, color_by?: string, party_location_id?: number | null, group_by?: string, compact?: boolean }>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const current = getSettings(db, campaignId)
  const colorBy = body.color_by !== undefined ? oneOf(COLOR_BY, body.color_by, current.color_by) : current.color_by
  const party = body.party_location_id !== undefined
    ? entityInCampaign(db, campaignId, body.party_location_id, 'Location')
    : current.party_location_id
  const groupBy = body.group_by !== undefined ? oneOf(GROUP_BY, body.group_by, current.group_by) : current.group_by
  const compact = body.compact !== undefined ? !!body.compact : current.compact
  db.prepare(`
    INSERT INTO story_board_settings (campaign_id, color_by, party_location_id, group_by, compact) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(campaign_id) DO UPDATE SET color_by = excluded.color_by, party_location_id = excluded.party_location_id,
      group_by = excluded.group_by, compact = excluded.compact
  `).run(campaignId, colorBy, party, groupBy, compact ? 1 : 0)
  return getSettings(db, campaignId)
})
