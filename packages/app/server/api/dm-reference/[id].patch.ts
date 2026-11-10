import { getDb } from '~~/server/utils/db'

/** Edit a DM Screen section (title, body, icon or position). */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ title?: string, body?: string, icon?: string | null, sort_order?: number }>(event) ?? {}
  const db = getDb()
  if (!db.prepare('SELECT id FROM dm_reference_sections WHERE id = ?').get(id)) throw createError({ statusCode: 404, message: 'Section not found' })
  const sets: string[] = []
  const vals: (string | number | null)[] = []
  if (body.title !== undefined) {
    const title = String(body.title).trim().slice(0, 200)
    if (!title) throw createError({ statusCode: 400, message: 'A title is required' })
    sets.push('title = ?')
    vals.push(title)
  }
  const set = (col: string, v: string | number | null) => {
    sets.push(`${col} = ?`)
    vals.push(v)
  }
  if (body.body !== undefined) set('body', String(body.body))
  if (body.icon !== undefined) set('icon', body.icon || null)
  if (body.sort_order !== undefined && Number.isFinite(Number(body.sort_order))) set('sort_order', Math.round(Number(body.sort_order)))
  if (sets.length) db.prepare(`UPDATE dm_reference_sections SET ${[...sets, 'updated_at = CURRENT_TIMESTAMP'].join(', ')} WHERE id = ?`).run(...vals, id)
  return db.prepare('SELECT id, title, icon, body, sort_order FROM dm_reference_sections WHERE id = ?').get(id)
})
