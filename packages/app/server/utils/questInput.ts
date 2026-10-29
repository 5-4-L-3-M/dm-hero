import type Database from 'better-sqlite3'
import { entityInCampaign, storylineInCampaign } from './storyBoard'
import { QUEST_STATUSES, oneOf, type Quest, type QuestObjective } from '../../types/story'

/**
 * Request body → quest metadata + location. Only the fields sent change
 * (current = the quest as it is now, null when creating). Other metadata keys
 * (written by the connector or a later version) are kept.
 */
export function questMetadataFromBody(
  db: Database.Database,
  campaignId: number,
  body: Record<string, unknown>,
  current: Quest | null,
  rawMetadata?: string | null,
): { metadata: Record<string, unknown>, locationId: number | null } {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  let base: Record<string, unknown> = {}
  try {
    base = rawMetadata ? JSON.parse(rawMetadata) ?? {} : {}
  }
  catch {
    base = {}
  }
  const objectives: QuestObjective[] = has('objectives') && Array.isArray(body.objectives)
    ? body.objectives
        .map(o => (typeof o === 'string' ? { text: o, done: false } : { text: String((o as QuestObjective)?.text ?? '').trim(), done: !!(o as QuestObjective)?.done }))
        .filter(o => o.text)
    : current?.objectives ?? []
  const metadata = {
    ...base,
    status: has('status') ? oneOf(QUEST_STATUSES, body.status, current?.status ?? 'rumor') : current?.status ?? 'rumor',
    giver_id: has('giver_id') ? entityInCampaign(db, campaignId, body.giver_id) : current?.giver_id ?? null,
    storyline_id: has('storyline_id') ? storylineInCampaign(db, campaignId, body.storyline_id) : current?.storyline_id ?? null,
    reward: has('reward') ? (typeof body.reward === 'string' && body.reward.trim() ? body.reward : null) : current?.reward ?? null,
    objectives,
    sort_order: has('sort_order') ? Number(body.sort_order) || 0 : current?.sort_order ?? 0,
  }
  const locationId = has('location_id') ? entityInCampaign(db, campaignId, body.location_id, 'Location') : current?.location_id ?? null
  return { metadata, locationId }
}
