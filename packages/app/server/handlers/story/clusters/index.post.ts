import { getDb } from '../../../utils/db'
import { entityInCampaign, loadBoard, nextSortOrder, requireCampaign, setClusterEntities, storylineInCampaign } from '../../../utils/storyBoard'
import { CLUSTER_HEATS, CLUSTER_STATUSES, oneOf } from '../../../../types/story'

/** POST /api/story/clusters { campaignId, title, storyline_id?, heat?, status?, notes?, location_id?, quest_id?, entity_ids? } */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const title = String(body.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'Title is required' })
  const order = nextSortOrder(db, 'SELECT MAX(sort_order) AS m FROM story_clusters WHERE campaign_id = ?', campaignId)
  const r = db.prepare(`
    INSERT INTO story_clusters (campaign_id, storyline_id, title, notes, heat, status, location_id, quest_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    campaignId,
    storylineInCampaign(db, campaignId, body.storyline_id),
    title,
    typeof body.notes === 'string' && body.notes.trim() ? body.notes : null,
    oneOf(CLUSTER_HEATS, body.heat, 'warm'),
    oneOf(CLUSTER_STATUSES, body.status, 'active'),
    entityInCampaign(db, campaignId, body.location_id, 'Location'),
    entityInCampaign(db, campaignId, body.quest_id, 'Quest'),
    order,
  )
  setClusterEntities(db, campaignId, Number(r.lastInsertRowid), body.entity_ids)
  return loadBoard(db, campaignId).clusters.find(c => c.id === Number(r.lastInsertRowid))
})
