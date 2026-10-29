import { getDb } from '../../utils/db'
import { requireCampaign } from '../../utils/storyBoard'

/**
 * GET /api/story/entities?campaignId — every entry that can be linked to a
 * beat (name + type), plus the location tree for the "party is at" filter.
 */
export default defineEventHandler((event) => {
  const db = getDb()
  const campaignId = requireCampaign(db, getQuery(event).campaignId)
  const entities = db.prepare(`
    SELECT e.id, e.name, et.name AS type, e.parent_entity_id AS parent_id
    FROM entities e JOIN entity_types et ON et.id = e.type_id
    WHERE e.campaign_id = ? AND e.deleted_at IS NULL AND e.archived_at IS NULL
    ORDER BY e.name COLLATE NOCASE
  `).all(campaignId) as Array<{ id: number, name: string, type: string, parent_id: number | null }>
  return {
    entities: entities.map(({ parent_id: _p, ...e }) => e),
    locations: entities.filter(e => e.type === 'Location').map(e => ({ id: e.id, name: e.name, parent_id: e.parent_id })),
  }
})
