import { getDb } from '../../../utils/db'
import { entityInCampaign, loadStorylines, requireRow } from '../../../utils/storyBoard'
import { clampStoryColor, cleanHex } from '../../../../types/story'

/** PATCH /api/story/storylines/:id { name?, color?, sort_order? } */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const row = requireRow(db, 'story_lines', getRouterParam(event, 'id'))
  const body = await readBody<{ name?: string, color?: number, custom_color?: string | null, sort_order?: number, kind?: string, player_id?: number | null }>(event) ?? {}
  const current = loadStorylines(db, row.campaign_id).find(s => s.id === row.id)!
  const name = body.name !== undefined ? String(body.name).trim() || current.name : current.name
  const color = body.color !== undefined ? clampStoryColor(body.color) : current.color
  const order = body.sort_order !== undefined ? Number(body.sort_order) || 0 : current.sort_order
  // Picking a theme color clears an own color; sending custom_color sets (or clears) it
  const custom = body.custom_color !== undefined ? cleanHex(body.custom_color) : body.color !== undefined ? null : current.custom_color ?? null
  db.prepare('UPDATE story_lines SET name = ?, color = ?, custom_color = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, color, custom, order, row.id)
  if (body.kind !== undefined) db.prepare('UPDATE story_lines SET kind = ? WHERE id = ?').run(body.kind === 'champion' ? 'champion' : 'world', row.id)
  if (body.player_id !== undefined) db.prepare('UPDATE story_lines SET player_id = ? WHERE id = ?').run(entityInCampaign(db, row.campaign_id, body.player_id, 'Player'), row.id)
  return loadStorylines(db, row.campaign_id).find(s => s.id === row.id)
})
