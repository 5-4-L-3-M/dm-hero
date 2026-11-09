import { getDb } from '../../../utils/db'
import { requireCampaign } from '../../../utils/storyBoard'
import type { PlaceKit } from '../../../../types/story'

/** Roles that make someone part of a place, in the order they're listed. */
const ROLE_ORDER = ['owns', 'rulesOver', 'worksAt', 'guards', 'patrolsIn', 'frequents', 'visitsOften', 'livesIn', 'currentlyAt', 'hidesIn']

/**
 * GET /api/story/places?campaignId — place kits built from what's already there:
 * the people tied to each place by relations, its table note, and how many live beats sit there.
 * Only places with a role-holder, a note or a live beat are listed.
 */
export default defineEventHandler((event) => {
  const db = getDb()
  const campaignId = requireCampaign(db, getQuery(event).campaignId)

  const places = db.prepare(`
    SELECT e.id, e.name, e.parent_entity_id AS parent_id, k.note
    FROM entities e
    JOIN entity_types et ON et.id = e.type_id AND et.name = 'Location'
    LEFT JOIN story_place_kits k ON k.location_id = e.id AND k.campaign_id = e.campaign_id
    WHERE e.campaign_id = ? AND e.deleted_at IS NULL
  `).all(campaignId) as Array<{ id: number, name: string, parent_id: number | null, note: string | null }>

  // Relations are stored one way; a person can be on either end
  const rels = db.prepare(`
    SELECT r.relation_type AS role,
           CASE WHEN fe.type_id = lt.id THEN r.from_entity_id ELSE r.to_entity_id END AS place_id,
           p.id, p.name
    FROM entity_relations r
    JOIN entities fe ON fe.id = r.from_entity_id AND fe.deleted_at IS NULL
    JOIN entities te ON te.id = r.to_entity_id AND te.deleted_at IS NULL
    JOIN entity_types lt ON lt.name = 'Location'
    JOIN entity_types nt ON nt.name = 'NPC'
    JOIN entities p ON p.id = CASE WHEN fe.type_id = lt.id THEN r.to_entity_id ELSE r.from_entity_id END
    WHERE fe.campaign_id = ?
      AND ((fe.type_id = lt.id AND te.type_id = nt.id) OR (te.type_id = lt.id AND fe.type_id = nt.id))
  `).all(campaignId) as Array<{ role: string, place_id: number, id: number, name: string }>

  const beats = db.prepare(`
    SELECT location_id, COUNT(*) AS n FROM story_beats
    WHERE campaign_id = ? AND location_id IS NOT NULL AND archived_at IS NULL AND status IN ('idea', 'ready')
    GROUP BY location_id
  `).all(campaignId) as Array<{ location_id: number, n: number }>
  const beatCount = new Map(beats.map(b => [b.location_id, b.n]))

  const rank = (role: string) => {
    const i = ROLE_ORDER.indexOf(role)
    return i < 0 ? ROLE_ORDER.length : i
  }
  const kits: PlaceKit[] = []
  for (const p of places) {
    const mine = rels.filter(r => r.place_id === p.id && rank(r.role) < ROLE_ORDER.length)
    // One line per person, their most telling role
    const people = new Map<number, { id: number, name: string, role: string }>()
    for (const r of mine.sort((a, b) => rank(a.role) - rank(b.role))) if (!people.has(r.id)) people.set(r.id, { id: r.id, name: r.name, role: r.role })
    const staff = [...people.values()].some(x => rank(x.role) < ROLE_ORDER.indexOf('livesIn'))
    const live = beatCount.get(p.id) ?? 0
    if (!staff && !p.note && !live) continue
    kits.push({
      id: p.id,
      name: p.name,
      parent_name: places.find(x => x.id === p.parent_id)?.name ?? null,
      note: p.note,
      people: [...people.values()],
      live_beats: live,
    })
  }
  return kits.sort((a, b) => a.name.localeCompare(b.name))
})
