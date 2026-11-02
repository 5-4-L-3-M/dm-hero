import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import { getDb } from '../../utils/db'
import { requireCampaign } from '../../utils/storyBoard'
import { DASHBOARD_BOARDS, DEFAULT_LAYOUTS, cleanLayout, type DashboardBoardKey } from '../../../types/dashboard'

/**
 * Dashboards: GET  /api/dashboard?campaignId&board        → cards (defaults if never saved)
 *             PUT  /api/dashboard  { campaignId, board, layout }
 *             DELETE /api/dashboard?campaignId&board     → back to the default
 */
const boardOf = (v: unknown): DashboardBoardKey => ((DASHBOARD_BOARDS as readonly unknown[]).includes(v) ? v as DashboardBoardKey : 'table')

export const dashboardRoutes: SubRoutes = {
  '': {
    GET: defineEventHandler((event) => {
      const db = getDb()
      const q = getQuery(event)
      const campaignId = requireCampaign(db, q.campaignId)
      const board = boardOf(q.board)
      const row = db.prepare('SELECT layout FROM dashboard_layouts WHERE campaign_id = ? AND board = ?').get(campaignId, board) as { layout: string } | undefined
      if (!row) return DEFAULT_LAYOUTS[board]
      try {
        return cleanLayout(JSON.parse(row.layout))
      }
      catch {
        return DEFAULT_LAYOUTS[board]
      }
    }),
    PUT: defineEventHandler(async (event) => {
      const db = getDb()
      const body = await readBody<{ campaignId: number, board: string, layout: unknown }>(event)
      const campaignId = requireCampaign(db, body?.campaignId)
      const layout = cleanLayout(body.layout)
      db.prepare(`
        INSERT INTO dashboard_layouts (campaign_id, board, layout) VALUES (?, ?, ?)
        ON CONFLICT(campaign_id, board) DO UPDATE SET layout = excluded.layout, updated_at = CURRENT_TIMESTAMP
      `).run(campaignId, boardOf(body.board), JSON.stringify(layout))
      return layout
    }),
    DELETE: defineEventHandler((event) => {
      const db = getDb()
      const q = getQuery(event)
      const campaignId = requireCampaign(db, q.campaignId)
      db.prepare('DELETE FROM dashboard_layouts WHERE campaign_id = ? AND board = ?').run(campaignId, boardOf(q.board))
      return DEFAULT_LAYOUTS[boardOf(q.board)]
    }),
  },
}

export default defineEventHandler(event => dispatchSubRoute(event, dashboardRoutes, getRouterParam(event, 'path') ?? ''))
