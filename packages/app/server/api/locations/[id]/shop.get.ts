import { getDb } from '../../../utils/db'
import { listShopItems } from '../../../utils/shop'
import { loadIconSet } from '../../../utils/gameIcons'

/** GET /api/locations/:id/shop — what this location sells */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Location ID is required' })
  // The icon set lets an item's name find the closest icon
  await loadIconSet().catch(() => null)
  return listShopItems(getDb(), id)
})
