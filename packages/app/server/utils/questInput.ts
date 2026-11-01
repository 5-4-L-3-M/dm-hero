import type Database from 'better-sqlite3'
import { entityInCampaign, questlineInCampaign, storylineInCampaign } from './storyBoard'
import { QUEST_IMPORTANCE, QUEST_STATUSES, oneOf, type Quest, type QuestImportance, type QuestObjective } from '../../types/story'

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
  // Givers: giver_ids (several) wins; a lone giver_id (older callers) replaces the list
  let giverIds = current?.giver_ids ?? []
  if (has('giver_ids') && Array.isArray(body.giver_ids)) {
    giverIds = [...new Set(body.giver_ids.map(id => entityInCampaign(db, campaignId, id)).filter((x): x is number => x !== null))]
  }
  else if (has('giver_id')) {
    const one = entityInCampaign(db, campaignId, body.giver_id)
    giverIds = one ? [one, ...giverIds.filter(x => x !== one)] : giverIds.slice(1)
  }
  const importance: QuestImportance | null = has('importance')
    ? ((QUEST_IMPORTANCE as readonly unknown[]).includes(body.importance) ? body.importance as QuestImportance : null)
    : current?.importance ?? null
  const optional: boolean | null = has('optional')
    ? (typeof body.optional === 'boolean' ? body.optional : null)
    : current?.optional ?? null
  const metadata = {
    ...base,
    status: has('status') ? oneOf(QUEST_STATUSES, body.status, current?.status ?? 'rumor') : current?.status ?? 'rumor',
    giver_id: giverIds[0] ?? null,
    giver_ids: giverIds,
    giver_hidden: has('giver_hidden') ? !!body.giver_hidden : current?.giver_hidden ?? false,
    importance,
    optional,
    questline_id: has('questline_id') ? questlineInCampaign(db, campaignId, body.questline_id) : current?.questline_id ?? null,
    questline_order: has('questline_order') ? Number(body.questline_order) || 0 : current?.questline_order ?? 0,
    storyline_id: has('storyline_id') ? storylineInCampaign(db, campaignId, body.storyline_id) : current?.storyline_id ?? null,
    reward: has('reward') ? (typeof body.reward === 'string' && body.reward.trim() ? body.reward : null) : current?.reward ?? null,
    objectives,
    sort_order: has('sort_order') ? Number(body.sort_order) || 0 : current?.sort_order ?? 0,
  }
  const locationId = has('location_id') ? entityInCampaign(db, campaignId, body.location_id, 'Location') : current?.location_id ?? null
  return { metadata, locationId }
}
