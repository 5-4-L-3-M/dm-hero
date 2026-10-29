import { getDb } from '../../utils/db'
import { loadQuest, setQuestInvolved } from '../../utils/storyBoard'
import { questMetadataFromBody } from '../../utils/questInput'

/** PATCH /api/quests/:id — only the fields sent change. */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const current = loadQuest(db, id)
  if (!current) throw createError({ statusCode: 404, message: 'Quest not found' })
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const campaignId = (db.prepare('SELECT campaign_id FROM entities WHERE id = ?').get(id) as { campaign_id: number }).campaign_id
  const raw = (db.prepare('SELECT metadata FROM entities WHERE id = ?').get(id) as { metadata: string | null }).metadata
  const { metadata, locationId } = questMetadataFromBody(db, campaignId, body, current, raw)
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  db.prepare('UPDATE entities SET name = ?, description = ?, location_id = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    has('name') ? String(body.name ?? '').trim() || current.name : current.name,
    has('description') ? (typeof body.description === 'string' && body.description.trim() ? body.description : null) : current.description,
    locationId,
    JSON.stringify(metadata),
    id,
  )
  if (has('involved_ids')) setQuestInvolved(db, campaignId, id, body.involved_ids)
  return loadQuest(db, id)
})
