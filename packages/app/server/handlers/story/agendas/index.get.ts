import { getDb } from '../../../utils/db'
import { loadAgendas, requireCampaign } from '../../../utils/storyBoard'

/** GET /api/story/agendas?campaignId[&factionId] */
export default defineEventHandler((event) => {
  const db = getDb()
  const q = getQuery(event)
  const campaignId = requireCampaign(db, q.campaignId)
  return loadAgendas(db, campaignId, q.factionId ? Number(q.factionId) : undefined)
})
