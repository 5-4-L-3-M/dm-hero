import { getDb } from '../../utils/db'
import { loadQuests, requireCampaign } from '../../utils/storyBoard'

/** GET /api/quests?campaignId — every quest with status, giver, place, objectives. */
export default defineEventHandler((event) => {
  const db = getDb()
  const campaignId = requireCampaign(db, getQuery(event).campaignId)
  return loadQuests(db, campaignId)
})
