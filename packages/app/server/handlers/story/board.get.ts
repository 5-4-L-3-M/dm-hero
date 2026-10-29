import { getDb } from '../../utils/db'
import { loadBoard, requireCampaign } from '../../utils/storyBoard'

/** GET /api/story/board?campaignId — the whole Story Board in one call. */
export default defineEventHandler((event) => {
  const db = getDb()
  const campaignId = requireCampaign(db, getQuery(event).campaignId)
  return loadBoard(db, campaignId)
})
