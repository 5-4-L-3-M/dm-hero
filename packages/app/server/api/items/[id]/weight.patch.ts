import { getDb } from '../../../utils/db'

/**
 * PATCH /api/items/:id/weight  { weight: number | null }
 * Sets (or clears) the weight of one item in POUNDS without touching any
 * other field — the generic item PATCH replaces metadata and location.
 */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ weight?: number | string | null }>(event)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Item ID is required' })
  }

  const raw = body?.weight
  const clear = raw === null || raw === undefined || raw === ''
  const weight = clear ? null : Number(raw)
  if (!clear && (!Number.isFinite(weight) || (weight as number) < 0)) {
    throw createError({ statusCode: 400, message: 'weight must be a number of pounds (0 or more)' })
  }

  const result = clear
    ? db
        .prepare(
          `UPDATE entities SET metadata = json_remove(COALESCE(metadata, '{}'), '$.weight'), updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND deleted_at IS NULL`,
        )
        .run(id)
    : db
        .prepare(
          `UPDATE entities SET metadata = json_set(COALESCE(metadata, '{}'), '$.weight', ?), updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND deleted_at IS NULL`,
        )
        .run(Math.round((weight as number) * 1000) / 1000, id)

  if (result.changes === 0) {
    throw createError({ statusCode: 404, message: 'Item not found' })
  }
  return { id, weight }
})
