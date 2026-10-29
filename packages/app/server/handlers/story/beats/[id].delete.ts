import { getDb } from '../../../utils/db'
import { requireRow } from '../../../utils/storyBoard'

/** DELETE /api/story/beats/:id */
export default defineEventHandler((event) => {
  const db = getDb()
  const row = requireRow(db, 'story_beats', getRouterParam(event, 'id'))
  db.prepare('DELETE FROM story_beats WHERE id = ?').run(row.id)
  return { ok: true }
})
