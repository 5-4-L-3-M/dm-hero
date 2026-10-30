import { getDb } from '../../../utils/db'
import { clusterDefaultEntityIds, clusterInCampaign, entityInCampaign, loadBeat, nextSortOrder, requireCampaign, setBeatEntities } from '../../../utils/storyBoard'
import { BEAT_KINDS, BEAT_STATUSES, oneOf } from '../../../../types/story'

/**
 * POST /api/story/beats { campaignId, title, body?, kind?, status?, cluster_id?, location_id?, entity_ids?, in_tray? }
 * No cluster_id → the beat lands on the sparks shelf. Without entity_ids a beat in a
 * cluster starts with the cluster's entries (and its quest's involved entries).
 */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const title = String(body.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'Title is required' })
  const clusterId = clusterInCampaign(db, campaignId, body.cluster_id)
  const order = nextSortOrder(db, `SELECT MAX(sort_order) AS m FROM story_beats WHERE campaign_id = ? AND cluster_id ${clusterId ? '= ?' : 'IS NULL'}`, ...(clusterId ? [campaignId, clusterId] : [campaignId]))
  const tray = body.in_tray ? nextSortOrder(db, 'SELECT MAX(tray_order) AS m FROM story_beats WHERE campaign_id = ?', campaignId) : null
  const id = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO story_beats (campaign_id, cluster_id, title, body, kind, status, location_id, sort_order, tray_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      campaignId,
      clusterId,
      title,
      typeof body.body === 'string' && body.body.trim() ? body.body : null,
      oneOf(BEAT_KINDS, body.kind, 'scene'),
      oneOf(BEAT_STATUSES, body.status, 'idea'),
      entityInCampaign(db, campaignId, body.location_id, 'Location'),
      order,
      tray,
    )
    const beatId = Number(r.lastInsertRowid)
    // No entries sent (quick add) → start with the cluster's entries and its quest's involved ones
    const ids = Array.isArray(body.entity_ids) ? body.entity_ids : (clusterId ? clusterDefaultEntityIds(db, clusterId) : [])
    setBeatEntities(db, campaignId, beatId, ids)
    return beatId
  })()
  return loadBeat(db, id)
})
