import { getDb } from '../../utils/db'
import { loadQuest } from '../../utils/storyBoard'

/** DELETE /api/quests/:id — soft delete, like every other entry. */
export default defineEventHandler((event) => {
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  if (!loadQuest(db, id)) throw createError({ statusCode: 404, message: 'Quest not found' })
  db.prepare('UPDATE entities SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
  return { ok: true }
})
