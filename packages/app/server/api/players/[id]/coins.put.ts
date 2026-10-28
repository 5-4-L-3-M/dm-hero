import { getDb } from '../../../utils/db'
import { getCampaignDenominations, getEntityCampaignId, setPurse } from '../../../utils/shop'
import { cleanPurse, purseTotal } from '~~/types/coins'

/** PUT /api/players/:id/coins  { coins: { GP: 12, SP: 5, ... } } */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const campaignId = Number.isInteger(id) ? getEntityCampaignId(db, id) : null
  if (campaignId === null) throw createError({ statusCode: 404, message: 'Player not found' })
  const body = await readBody<{ coins?: Record<string, number> }>(event)
  const denominations = getCampaignDenominations(db, campaignId)
  const coins = cleanPurse(body?.coins, denominations)
  setPurse(db, id, coins)
  return { coins, total: purseTotal(coins, denominations), denominations }
})
