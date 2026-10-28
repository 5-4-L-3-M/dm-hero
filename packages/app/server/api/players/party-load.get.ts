import { getDb } from '../../utils/db'
import { getPartyLoad } from '../../utils/inventory'

/**
 * GET /api/players/party-load?campaignId=1
 * Carried weight vs. carrying capacity for every player in the campaign.
 */
export default defineEventHandler((event) => {
  const campaignId = Number(getQuery(event).campaignId)
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    throw createError({ statusCode: 400, message: 'campaignId is required' })
  }
  return getPartyLoad(getDb(), campaignId)
})
