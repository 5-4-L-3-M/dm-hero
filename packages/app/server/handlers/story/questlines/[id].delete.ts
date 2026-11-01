import { getDb } from '../../../utils/db'
import { requireRow } from '../../../utils/storyBoard'

/** DELETE /api/story/questlines/:id — its quests stay, just without a questline. */
export default defineEventHandler((event) => {
  const db = getDb()
  const row = requireRow(db, 'story_questlines', getRouterParam(event, 'id'))
  db.prepare('DELETE FROM story_questlines WHERE id = ?').run(row.id)
  return { ok: true }
})
