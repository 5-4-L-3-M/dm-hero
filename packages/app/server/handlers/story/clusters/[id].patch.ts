import { getDb } from '../../../utils/db'
import { entityInCampaign, loadBoard, requireRow, setClusterEntities, storylineInCampaign } from '../../../utils/storyBoard'
import { CLUSTER_HEATS, CLUSTER_STATUSES, oneOf } from '../../../../types/story'

/** PATCH /api/story/clusters/:id — only the fields sent change. */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const row = requireRow(db, 'story_clusters', getRouterParam(event, 'id'))
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const c = loadBoard(db, row.campaign_id).clusters.find(x => x.id === row.id)!
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  db.prepare(`
    UPDATE story_clusters SET storyline_id = ?, title = ?, notes = ?, heat = ?, status = ?, location_id = ?, quest_id = ?,
      collapsed = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    has('storyline_id') ? storylineInCampaign(db, row.campaign_id, body.storyline_id) : c.storyline_id,
    has('title') ? String(body.title ?? '').trim() || c.title : c.title,
    has('notes') ? (typeof body.notes === 'string' && body.notes.trim() ? body.notes : null) : c.notes,
    has('heat') ? oneOf(CLUSTER_HEATS, body.heat, c.heat) : c.heat,
    has('status') ? oneOf(CLUSTER_STATUSES, body.status, c.status) : c.status,
    has('location_id') ? entityInCampaign(db, row.campaign_id, body.location_id, 'Location') : c.location_id,
    has('quest_id') ? entityInCampaign(db, row.campaign_id, body.quest_id, 'Quest') : c.quest_id,
    has('collapsed') ? (body.collapsed ? 1 : 0) : (c.collapsed ? 1 : 0),
    has('sort_order') ? Number(body.sort_order) || 0 : c.sort_order,
    row.id,
  )
  if (has('entity_ids')) setClusterEntities(db, row.campaign_id, row.id, body.entity_ids)
  // Archive / restore (its beats stay with it and leave the next-session tray)
  if (has('archived')) {
    db.prepare(`UPDATE story_clusters SET archived_at = ${body.archived ? 'CURRENT_TIMESTAMP' : 'NULL'} WHERE id = ?`).run(row.id)
    if (body.archived) db.prepare('UPDATE story_beats SET tray_order = NULL WHERE cluster_id = ?').run(row.id)
  }
  return loadBoard(db, row.campaign_id).clusters.find(x => x.id === row.id)
})
