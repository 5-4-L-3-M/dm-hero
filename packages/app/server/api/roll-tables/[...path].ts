import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import { getDb } from '../../utils/db'
import { requireCampaign } from '../../utils/storyBoard'
import { getRollTable, listRollTables, saveRollTable, type RollTableInput } from '../../utils/rollTables'

/**
 * Roll tables:
 *   GET    /api/roll-tables?campaignId[&entityId|&sessionId]   → tables (only the tagged ones when filtered)
 *   POST   /api/roll-tables { campaignId, name, rows, tags … }
 *   PATCH  /api/roll-tables/:id
 *   DELETE /api/roll-tables/:id
 */
function owned(id: unknown) {
  const t = getRollTable(getDb(), Number(id))
  if (!t) throw createError({ statusCode: 404, message: 'Roll table not found' })
  return t
}

export const rollTableRoutes: SubRoutes = {
  '': {
    GET: defineEventHandler((event) => {
      const db = getDb()
      const q = getQuery(event)
      const campaignId = requireCampaign(db, q.campaignId)
      const filter = Number(q.entityId) ? { kind: 'entity' as const, refId: Number(q.entityId) } : Number(q.sessionId) ? { kind: 'session' as const, refId: Number(q.sessionId) } : undefined
      return listRollTables(db, campaignId, filter)
    }),
    POST: defineEventHandler(async (event) => {
      const db = getDb()
      const body = await readBody<RollTableInput & { campaignId: number }>(event)
      const campaignId = requireCampaign(db, body?.campaignId)
      return getRollTable(db, saveRollTable(db, campaignId, null, body))
    }),
  },
  ':id': {
    PATCH: defineEventHandler(async (event) => {
      const t = owned(getRouterParam(event, 'id'))
      const body = await readBody<RollTableInput>(event) ?? {}
      return getRollTable(getDb(), saveRollTable(getDb(), t.campaign_id, t.id, body))
    }),
    DELETE: defineEventHandler((event) => {
      const t = owned(getRouterParam(event, 'id'))
      getDb().prepare('DELETE FROM roll_tables WHERE id = ?').run(t.id)
      return { ok: true }
    }),
  },
}

export default defineEventHandler(event => dispatchSubRoute(event, rollTableRoutes, getRouterParam(event, 'path') ?? ''))
