import { getDb } from '../../../utils/db'
import { listShopItems } from '../../../utils/shop'

/** GET /api/locations/:id/shop — what this location sells */
export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Location ID is required' })
  return listShopItems(getDb(), id)
})
