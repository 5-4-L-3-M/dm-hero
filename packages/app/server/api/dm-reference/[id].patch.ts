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
  if (body.body !== undefined) { sets.push('body = ?'); vals.push(String(body.body)) }
  if (body.icon !== undefined) { sets.push('icon = ?'); vals.push(body.icon || null) }
  if (body.sort_order !== undefined && Number.isFinite(Number(body.sort_order))) { sets.push('sort_order = ?'); vals.push(Math.round(Number(body.sort_order))) }
  if (sets.length) db.prepare(`UPDATE dm_reference_sections SET ${[...sets, 'updated_at = CURRENT_TIMESTAMP'].join(', ')} WHERE id = ?`).run(...vals, id)
  return db.prepare('SELECT id, title, icon, body, sort_order FROM dm_reference_sections WHERE id = ?').get(id)
})
