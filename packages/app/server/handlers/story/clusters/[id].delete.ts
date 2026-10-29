import { getDb } from '../../../utils/db'
import { requireRow } from '../../../utils/storyBoard'

/**
 * DELETE /api/story/clusters/:id — the cluster goes; its beats go back to the
 * sparks shelf unless ?withBeats=true.
 */
export default defineEventHandler((event) => {
  const db = getDb()
  const row = requireRow(db, 'story_clusters', getRouterParam(event, 'id'))
  const withBeats = getQuery(event).withBeats === 'true'
  db.transaction(() => {
    if (withBeats) db.prepare('DELETE FROM story_beats WHERE cluster_id = ?').run(row.id)
    db.prepare('DELETE FROM story_clusters WHERE id = ?').run(row.id)
  })()
  return { ok: true }
})
