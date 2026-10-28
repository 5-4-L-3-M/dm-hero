import { getDb } from '../../../utils/db'
import { rethrowShopError, sellShopItem } from '../../../utils/shop'

/**
 * POST /api/shop-items/:id/sell  { playerId, quantity?, priceEachCp?, charge? }
 * Adds the item to a character's inventory and takes the coin from their purse.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ playerId?: number, quantity?: number, priceEachCp?: number | null, charge?: boolean }>(event)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Shop item ID is required' })
  if (!body?.playerId) throw createError({ statusCode: 400, message: 'playerId is required' })
  try {
    return sellShopItem(getDb(), {
      shopItemId: id,
      playerId: Number(body.playerId),
      quantity: body.quantity,
      priceEachCp: body.priceEachCp === undefined || body.priceEachCp === null ? null : Number(body.priceEachCp),
      charge: body.charge,
    })
  }
  catch (error) {
    rethrowShopError(error)
  }
})
