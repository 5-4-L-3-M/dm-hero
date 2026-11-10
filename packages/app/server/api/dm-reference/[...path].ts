import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import { getDb } from '../../utils/db'
import { DM_REFERENCE_SEED } from '../../utils/dmReferenceSeed'

/**
 * DM Screen sections (side panel rules reference):
 *   GET    /api/dm-reference?campaignId     → sections (an empty screen gets the starter sections)
 *   POST   /api/dm-reference { campaignId, title, body?, icon? }
 *   PATCH  /api/dm-reference/reorder { ids }
 *   PATCH  /api/dm-reference/:id { title?, body?, icon?, sort_order? }
 *   DELETE /api/dm-reference/:id
 * One catch-all route keeps the typed route list small.
 */
const COLS = 'id, title, icon, body, sort_order'
const one = (id: number | bigint) => getDb().prepare(`SELECT ${COLS} FROM dm_reference_sections WHERE id = ?`).get(id)

export const dmReferenceRoutes: SubRoutes = {
  '': {
    GET: defineEventHandler((event) => {
      const campaignId = Number(getQuery(event).campaignId)
      if (!campaignId) throw createError({ statusCode: 400, message: 'Campaign ID is required' })
      const db = getDb()
      const list = () => db.prepare(`SELECT ${COLS} FROM dm_reference_sections WHERE campaign_id = ? ORDER BY sort_order, id`).all(campaignId)
      let rows = list()
      if (!rows.length) {
        const ins = db.prepare('INSERT INTO dm_reference_sections (campaign_id, title, icon, body, sort_order) VALUES (?, ?, ?, ?, ?)')
        db.transaction(() => DM_REFERENCE_SEED.forEach((s, i) => ins.run(campaignId, s.title, s.icon, s.body, i)))()
        rows = list()
      }
      return rows
    }),
    POST: defineEventHandler(async (event) => {
      const body = await readBody<{ campaignId?: number, title?: string, body?: string, icon?: string }>(event)
      const campaignId = Number(body?.campaignId)
      const title = String(body?.title ?? '').trim().slice(0, 200)
      if (!campaignId || !title) throw createError({ statusCode: 400, message: 'Campaign and title are required' })
      const db = getDb()
      const next = (db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM dm_reference_sections WHERE campaign_id = ?').get(campaignId) as { n: number }).n
      const id = db.prepare('INSERT INTO dm_reference_sections (campaign_id, title, icon, body, sort_order) VALUES (?, ?, ?, ?, ?)')
        .run(campaignId, title, body?.icon || null, String(body?.body ?? ''), next).lastInsertRowid
      return one(id)
    }),
  },
  'reorder': {
    PATCH: defineEventHandler(async (event) => {
      const body = await readBody<{ ids?: number[] }>(event)
      const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : []
      const db = getDb()
      const upd = db.prepare('UPDATE dm_reference_sections SET sort_order = ? WHERE id = ?')
      db.transaction(() => ids.forEach((id, i) => upd.run(i, id)))()
      return { ok: true }
    }),
  },
  ':id': {
    PATCH: defineEventHandler(async (event) => {
      const id = Number(getRouterParam(event, 'id'))
      const body = await readBody<{ title?: string, body?: string, icon?: string | null, sort_order?: number }>(event) ?? {}
      const db = getDb()
      if (!one(id)) throw createError({ statusCode: 404, message: 'Section not found' })
      const sets: string[] = []
      const vals: (string | number | null)[] = []
      const set = (col: string, v: string | number | null) => {
        sets.push(`${col} = ?`)
        vals.push(v)
      }
      if (body.title !== undefined) {
        const title = String(body.title).trim().slice(0, 200)
        if (!title) throw createError({ statusCode: 400, message: 'A title is required' })
        set('title', title)
      }
      if (body.body !== undefined) set('body', String(body.body))
      if (body.icon !== undefined) set('icon', body.icon || null)
      if (body.sort_order !== undefined && Number.isFinite(Number(body.sort_order))) set('sort_order', Math.round(Number(body.sort_order)))
      if (sets.length) db.prepare(`UPDATE dm_reference_sections SET ${[...sets, 'updated_at = CURRENT_TIMESTAMP'].join(', ')} WHERE id = ?`).run(...vals, id)
      return one(id)
    }),
    DELETE: defineEventHandler((event) => {
      getDb().prepare('DELETE FROM dm_reference_sections WHERE id = ?').run(Number(getRouterParam(event, 'id')))
      return { ok: true }
    }),
  },
}

export default defineEventHandler(event => dispatchSubRoute(event, dmReferenceRoutes, getRouterParam(event, 'path') ?? ''))
