import { getDb } from '../../../utils/db'
import { loadQuestlines, nextSortOrder, requireCampaign, storylineInCampaign } from '../../../utils/storyBoard'
import { QUEST_IMPORTANCE, oneOf } from '../../../../types/story'

/** POST /api/story/questlines { campaignId, name, storyline_id?, importance?, optional?, notes? } */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const name = String(body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })
  const order = nextSortOrder(db, 'SELECT MAX(sort_order) AS m FROM story_questlines WHERE campaign_id = ?', campaignId)
  const r = db.prepare('INSERT INTO story_questlines (campaign_id, storyline_id, name, importance, optional, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    campaignId,
    storylineInCampaign(db, campaignId, body.storyline_id),
    name,
    oneOf(QUEST_IMPORTANCE, body.importance, 'major'),
    body.optional ? 1 : 0,
    typeof body.notes === 'string' && body.notes.trim() ? body.notes : null,
    order,
  )
  return loadQuestlines(db, campaignId).find(q => q.id === Number(r.lastInsertRowid))
})
