import { getDb } from '../../../utils/db'
import { clusterInCampaign, entityInCampaign, loadBeat, nextSortOrder, requireRow, setBeatEntities } from '../../../utils/storyBoard'
import { BEAT_KINDS, BEAT_STATUSES, oneOf } from '../../../../types/story'

/**
 * PATCH /api/story/beats/:id — only the fields sent change.
 * in_tray: true/false adds to / removes from the next-session tray.
 * played_session_id: logs the beat as played in that session (status → played, leaves the tray).
 */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const row = requireRow(db, 'story_beats', getRouterParam(event, 'id'))
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const b = loadBeat(db, row.id)!
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const campaignId = row.campaign_id

  let clusterId = b.cluster_id
  let sortOrder = b.sort_order
  if (has('cluster_id')) {
    clusterId = body.cluster_id === null ? null : clusterInCampaign(db, campaignId, body.cluster_id) ?? b.cluster_id
    if (clusterId !== b.cluster_id) {
      sortOrder = nextSortOrder(db, `SELECT MAX(sort_order) AS m FROM story_beats WHERE campaign_id = ? AND cluster_id ${clusterId ? '= ?' : 'IS NULL'}`, ...(clusterId ? [campaignId, clusterId] : [campaignId]))
    }
  }
  if (has('sort_order')) sortOrder = Number(body.sort_order) || 0

  let status = has('status') ? oneOf(BEAT_STATUSES, body.status, b.status) : b.status
  let tray = b.tray_order
  if (has('in_tray')) {
    if (!body.in_tray) tray = null
    else if (tray === null) tray = nextSortOrder(db, 'SELECT MAX(tray_order) AS m FROM story_beats WHERE campaign_id = ?', campaignId)
  }
  let played = b.played_session_id
  if (has('played_session_id')) {
    const sid = Number(body.played_session_id)
    played = body.played_session_id && db.prepare('SELECT 1 FROM sessions WHERE id = ? AND campaign_id = ?').get(sid, campaignId) ? sid : null
    if (played) {
      status = 'played'
      tray = null
    }
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE story_beats SET cluster_id = ?, title = ?, body = ?, kind = ?, status = ?, location_id = ?, sort_order = ?,
        tray_order = ?, played_session_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      clusterId,
      has('title') ? String(body.title ?? '').trim() || b.title : b.title,
      has('body') ? (typeof body.body === 'string' && body.body.trim() ? body.body : null) : b.body,
      has('kind') ? oneOf(BEAT_KINDS, body.kind, b.kind) : b.kind,
      status,
      has('location_id') ? entityInCampaign(db, campaignId, body.location_id, 'Location') : b.location_id,
      sortOrder,
      tray,
      played,
      row.id,
    )
    if (has('entity_ids')) setBeatEntities(db, campaignId, row.id, body.entity_ids)
  })()
  return loadBeat(db, row.id)
})
