import { getDb } from '../../../utils/db'
import { loadStorylines, nextSortOrder, requireCampaign } from '../../../utils/storyBoard'
import { clampStoryColor, nextStoryColor } from '../../../../types/story'

/** POST /api/story/storylines { campaignId, name, color? } */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{ campaignId: number, name: string, color?: number }>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const name = String(body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })
  const used = loadStorylines(db, campaignId).map(s => s.color)
  const color = body.color ? clampStoryColor(body.color) : nextStoryColor(used)
  const order = nextSortOrder(db, 'SELECT MAX(sort_order) AS m FROM story_lines WHERE campaign_id = ?', campaignId)
  const r = db.prepare('INSERT INTO story_lines (campaign_id, name, color, sort_order) VALUES (?, ?, ?, ?)').run(campaignId, name, color, order)
  return loadStorylines(db, campaignId).find(s => s.id === Number(r.lastInsertRowid))
})
