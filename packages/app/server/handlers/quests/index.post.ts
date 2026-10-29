import { getDb } from '../../utils/db'
import { loadQuest, questTypeId, requireCampaign } from '../../utils/storyBoard'
import { questMetadataFromBody } from '../../utils/questInput'

/** POST /api/quests { campaignId, name, description?, status?, giver_id?, location_id?, storyline_id?, reward?, objectives? } */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const name = String(body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })
  const { metadata, locationId } = questMetadataFromBody(db, campaignId, body, null)
  const r = db.prepare('INSERT INTO entities (type_id, campaign_id, name, description, location_id, metadata) VALUES (?, ?, ?, ?, ?, ?)')
    .run(questTypeId(db), campaignId, name, typeof body.description === 'string' && body.description.trim() ? body.description : null, locationId, JSON.stringify(metadata))
  return loadQuest(db, Number(r.lastInsertRowid))
})
