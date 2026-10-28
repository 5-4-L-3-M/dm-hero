import { getDb } from '../../../utils/db'
import { getPlayerInventory } from '../../../utils/inventory'

/**
 * GET /api/players/:id/inventory
 * Items the character carries (quantity, equipped, weight in lb) plus
 * carrying capacity and encumbrance from their Strength score.
 */
export default defineEventHandler((event) => {
  const playerId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(playerId) || playerId <= 0) {
    throw createError({ statusCode: 400, message: 'Player ID is required' })
  }
  return getPlayerInventory(getDb(), playerId)
})
