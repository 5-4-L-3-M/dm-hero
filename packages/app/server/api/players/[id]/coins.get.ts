import { getDb } from '../../../utils/db'
import { getCampaignDenominations, getEntityCampaignId, getPurse } from '../../../utils/shop'
import { purseTotal } from '~~/types/coins'

/** GET /api/players/:id/coins — the character's purse */
export default defineEventHandler((event) => {
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const campaignId = Number.isInteger(id) ? getEntityCampaignId(db, id) : null
  if (campaignId === null) throw createError({ statusCode: 404, message: 'Player not found' })
  const denominations = getCampaignDenominations(db, campaignId)
  const coins = getPurse(db, id, denominations)
  return { coins, total: purseTotal(coins, denominations), denominations }
})
