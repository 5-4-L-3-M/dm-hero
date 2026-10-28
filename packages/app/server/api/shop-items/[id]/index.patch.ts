import { getDb } from '../../../utils/db'
import { rethrowShopError, updateShopItem } from '../../../utils/shop'
import type { ShopItemInput } from '~~/types/shop'

/** PATCH /api/shop-items/:id — edit a shop row (only the fields sent change) */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Shop item ID is required' })
  const body = await readBody<ShopItemInput>(event)
  try {
    return updateShopItem(getDb(), id, body ?? {})
  }
  catch (error) {
    rethrowShopError(error)
  }
})
