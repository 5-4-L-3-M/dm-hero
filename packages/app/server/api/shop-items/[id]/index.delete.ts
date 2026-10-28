import { getDb } from '../../../utils/db'

/** DELETE /api/shop-items/:id */
export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Shop item ID is required' })
  const result = getDb().prepare('DELETE FROM shop_items WHERE id = ?').run(id)
  if (result.changes === 0) throw createError({ statusCode: 404, message: 'Shop item not found' })
  return { success: true }
})
