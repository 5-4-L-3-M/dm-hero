import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import { getDb } from '../../utils/db'
import { buyFromPlayer, rethrowShopError, sellOffers } from '../../utils/shop'

/**
 * Selling loot to a shop:
 *   GET  /api/shop/offers?locationId&playerId → the character's items with this shop's offer
 *   POST /api/shop/buy { locationId, playerId, relationId, quantity?, priceEachCp?, addToStock? }
 */
export const shopRoutes: SubRoutes = {
  offers: {
    GET: defineEventHandler((event) => {
      const q = getQuery(event)
      try {
        return sellOffers(getDb(), Number(q.locationId), Number(q.playerId))
      }
      catch (e) {
        rethrowShopError(e)
      }
    }),
  },
  buy: {
    POST: defineEventHandler(async (event) => {
      const b = await readBody<{ locationId: number, playerId: number, relationId: number, quantity?: number, priceEachCp?: number | null, addToStock?: boolean }>(event)
      try {
        return buyFromPlayer(getDb(), {
          locationId: Number(b?.locationId),
          playerId: Number(b?.playerId),
          relationId: Number(b?.relationId),
          quantity: b?.quantity,
          priceEachCp: b?.priceEachCp === undefined || b?.priceEachCp === null ? null : Number(b.priceEachCp),
          addToStock: b?.addToStock,
        })
      }
      catch (e) {
        rethrowShopError(e)
      }
    }),
  },
}

export default defineEventHandler(event => dispatchSubRoute(event, shopRoutes, getRouterParam(event, 'path') ?? ''))
