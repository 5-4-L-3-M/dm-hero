import { getDb } from '../../../utils/db'
import { requireRow } from '../../../utils/storyBoard'

/** DELETE /api/story/storylines/:id — its clusters stay, without a storyline. */
export default defineEventHandler((event) => {
  const db = getDb()
  const row = requireRow(db, 'story_lines', getRouterParam(event, 'id'))
  db.prepare('DELETE FROM story_lines WHERE id = ?').run(row.id)
  return { ok: true }
})
