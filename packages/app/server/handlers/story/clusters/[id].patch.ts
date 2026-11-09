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
  // Pin / clock
  if (has('heat_pinned')) db.prepare('UPDATE story_clusters SET heat_pinned = ? WHERE id = ?').run(body.heat_pinned ? 1 : 0, row.id)
  if (has('clock_size')) {
    const size = Number(body.clock_size)
    const clock = Number.isFinite(size) && size >= 2 ? Math.min(12, Math.round(size)) : null
    db.prepare('UPDATE story_clusters SET clock_size = ?, clock_filled = MIN(clock_filled, COALESCE(?, 0)) WHERE id = ?').run(clock, clock, row.id)
  }
  if (has('clock_filled')) db.prepare('UPDATE story_clusters SET clock_filled = MAX(0, MIN(?, COALESCE(clock_size, 0))) WHERE id = ?').run(Number(body.clock_filled) || 0, row.id)
  if (has('clock_label')) db.prepare('UPDATE story_clusters SET clock_label = ? WHERE id = ?').run(typeof body.clock_label === 'string' && body.clock_label.trim() ? body.clock_label.trim() : null, row.id)
  // Working on a cluster counts as touching it: its heat drift starts over
  if (['title', 'notes', 'heat', 'status', 'clock_filled'].some(has)) db.prepare('UPDATE story_clusters SET idle_sessions = 0 WHERE id = ?').run(row.id)
  if (has('entity_ids')) setClusterEntities(db, row.campaign_id, row.id, body.entity_ids)
  // The whole cluster into (or out of) the next-session tray: every beat not played, cut or archived
  if (has('in_tray')) {
    if (body.in_tray) {
      const top = (db.prepare('SELECT COALESCE(MAX(tray_order), -1) AS m FROM story_beats WHERE campaign_id = ?').get(row.campaign_id) as { m: number }).m
      const beats = db.prepare('SELECT id FROM story_beats WHERE cluster_id = ? AND tray_order IS NULL AND archived_at IS NULL AND status NOT IN (\'played\', \'cut\') ORDER BY sort_order, id').all(row.id) as { id: number }[]
      const set = db.prepare('UPDATE story_beats SET tray_order = ? WHERE id = ?')
      beats.forEach((x, i) => set.run(top + 1 + i, x.id))
    }
    else {
      db.prepare('UPDATE story_beats SET tray_order = NULL WHERE cluster_id = ?').run(row.id)
    }
  }
  // Archive / restore (its beats stay with it and leave the next-session tray)
  if (has('archived')) {
    db.prepare(`UPDATE story_clusters SET archived_at = ${body.archived ? 'CURRENT_TIMESTAMP' : 'NULL'} WHERE id = ?`).run(row.id)
    if (body.archived) db.prepare('UPDATE story_beats SET tray_order = NULL WHERE cluster_id = ?').run(row.id)
  }
  return loadBoard(db, row.campaign_id).clusters.find(x => x.id === row.id)
})
