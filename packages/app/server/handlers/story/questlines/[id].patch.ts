import { getDb } from '../../../utils/db'
import { loadQuestlines, requireRow, storylineInCampaign } from '../../../utils/storyBoard'
import { QUEST_IMPORTANCE, oneOf } from '../../../../types/story'

/** PATCH /api/story/questlines/:id — only the fields sent change. */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const row = requireRow(db, 'story_questlines', getRouterParam(event, 'id'))
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const cur = loadQuestlines(db, row.campaign_id).find(q => q.id === row.id)!
  db.prepare('UPDATE story_questlines SET storyline_id = ?, name = ?, importance = ?, optional = ?, notes = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    has('storyline_id') ? storylineInCampaign(db, row.campaign_id, body.storyline_id) : cur.storyline_id,
    has('name') ? String(body.name ?? '').trim() || cur.name : cur.name,
    has('importance') ? oneOf(QUEST_IMPORTANCE, body.importance, cur.importance) : cur.importance,
    (has('optional') ? !!body.optional : cur.optional) ? 1 : 0,
    has('notes') ? (typeof body.notes === 'string' && body.notes.trim() ? body.notes : null) : cur.notes,
    has('sort_order') ? Number(body.sort_order) || 0 : cur.sort_order,
    row.id,
  )
  return loadQuestlines(db, row.campaign_id).find(q => q.id === row.id)
})
