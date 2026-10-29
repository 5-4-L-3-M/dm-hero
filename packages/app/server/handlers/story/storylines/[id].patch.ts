import { getDb } from '../../../utils/db'
import { loadStorylines, requireRow } from '../../../utils/storyBoard'
import { clampStoryColor } from '../../../../types/story'

/** PATCH /api/story/storylines/:id { name?, color?, sort_order? } */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const row = requireRow(db, 'story_lines', getRouterParam(event, 'id'))
  const body = await readBody<{ name?: string, color?: number, sort_order?: number }>(event) ?? {}
  const current = loadStorylines(db, row.campaign_id).find(s => s.id === row.id)!
  const name = body.name !== undefined ? String(body.name).trim() || current.name : current.name
  const color = body.color !== undefined ? clampStoryColor(body.color) : current.color
  const order = body.sort_order !== undefined ? Number(body.sort_order) || 0 : current.sort_order
  db.prepare('UPDATE story_lines SET name = ?, color = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, color, order, row.id)
  return loadStorylines(db, row.campaign_id).find(s => s.id === row.id)
})
