import { getDb } from '../../../utils/db'
import { requireRow } from '../../../utils/storyBoard'

/** DELETE /api/story/agendas/:id */
export default defineEventHandler((event) => {
  const db = getDb()
  const row = requireRow(db, 'faction_agendas', getRouterParam(event, 'id'))
  db.prepare('DELETE FROM faction_agendas WHERE id = ?').run(row.id)
  return { ok: true }
})
