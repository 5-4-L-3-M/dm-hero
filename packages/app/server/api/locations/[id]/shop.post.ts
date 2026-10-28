import { getDb } from '../../../utils/db'
import { createShopItem, rethrowShopError } from '../../../utils/shop'
import type { ShopItemInput } from '~~/types/shop'

/** POST /api/locations/:id/shop — add an item to this location's stock */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Location ID is required' })
  const body = await readBody<ShopItemInput>(event)
  try {
    return createShopItem(getDb(), id, body ?? {})
  }
  catch (error) {
    rethrowShopError(error)
  }
})
