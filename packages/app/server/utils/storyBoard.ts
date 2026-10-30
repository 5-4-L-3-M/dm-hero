import type Database from 'better-sqlite3'
import {
  BEAT_KINDS, BEAT_STATUSES, COLOR_BY, GROUP_BY, QUEST_INVOLVED_RELATION, oneOf, readQuestMetadata,
  type FactionAgenda, type LinkedEntity, type Quest, type StoryBeat, type StoryBoard, type StoryCluster, type StoryLine,
} from '../../types/story'

/** 400 unless the campaign exists. */
export function requireCampaign(db: Database.Database, campaignId: unknown): number {
  const id = Number(campaignId)
  if (!Number.isInteger(id) || id <= 0 || !db.prepare('SELECT 1 FROM campaigns WHERE id = ?').get(id)) {
    throw createError({ statusCode: 400, message: 'A valid campaignId is required' })
  }
  return id
}

/** 404 unless the row exists; returns its campaign id. */
export function requireRow(db: Database.Database, table: 'story_lines' | 'story_clusters' | 'story_beats' | 'faction_agendas', id: unknown): { id: number, campaign_id: number } {
  const n = Number(id)
  const row = Number.isInteger(n) ? db.prepare(`SELECT id, campaign_id FROM ${table} WHERE id = ?`).get(n) as { id: number, campaign_id: number } | undefined : undefined
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  return row
}

/** An entity id of this campaign (optionally of one type), or null. */
export function entityInCampaign(db: Database.Database, campaignId: number, id: unknown, typeName?: string): number | null {
  const n = Number(id)
  if (!id || !Number.isInteger(n) || n <= 0) return null
  const row = db.prepare(`
    SELECT e.id FROM entities e JOIN entity_types et ON et.id = e.type_id
    WHERE e.id = ? AND e.campaign_id = ? AND e.deleted_at IS NULL ${typeName ? 'AND et.name = ?' : ''}
  `).get(...(typeName ? [n, campaignId, typeName] : [n, campaignId]))
  return row ? n : null
}

export function storylineInCampaign(db: Database.Database, campaignId: number, id: unknown): number | null {
  const n = Number(id)
  if (!id || !Number.isInteger(n)) return null
  return db.prepare('SELECT 1 FROM story_lines WHERE id = ? AND campaign_id = ?').get(n, campaignId) ? n : null
}

export function clusterInCampaign(db: Database.Database, campaignId: number, id: unknown): number | null {
  const n = Number(id)
  if (!id || !Number.isInteger(n)) return null
  return db.prepare('SELECT 1 FROM story_clusters WHERE id = ? AND campaign_id = ?').get(n, campaignId) ? n : null
}

/** Replace the entities linked to a beat (only this campaign's, deduped). */
export function setBeatEntities(db: Database.Database, campaignId: number, beatId: number, ids: unknown) {
  db.prepare('DELETE FROM story_beat_entities WHERE beat_id = ?').run(beatId)
  if (!Array.isArray(ids)) return
  const insert = db.prepare('INSERT OR IGNORE INTO story_beat_entities (beat_id, entity_id) VALUES (?, ?)')
  for (const id of ids) {
    const ok = entityInCampaign(db, campaignId, id)
    if (ok) insert.run(beatId, ok)
  }
}

export function getSettings(db: Database.Database, campaignId: number): StoryBoard['settings'] {
  const row = db.prepare('SELECT color_by, party_location_id, group_by, compact FROM story_board_settings WHERE campaign_id = ?').get(campaignId) as { color_by: string, party_location_id: number | null, group_by: string, compact: number } | undefined
  return {
    color_by: oneOf(COLOR_BY, row?.color_by, 'storyline'),
    party_location_id: row?.party_location_id ?? null,
    group_by: oneOf(GROUP_BY, row?.group_by, 'storyline'),
    compact: !!row?.compact,
  }
}

export function loadStorylines(db: Database.Database, campaignId: number): StoryLine[] {
  return db.prepare('SELECT id, name, color, sort_order FROM story_lines WHERE campaign_id = ? ORDER BY sort_order, id').all(campaignId) as StoryLine[]
}

/** The whole board in one go: settings, storylines, clusters, beats with links. */
export function loadBoard(db: Database.Database, campaignId: number): StoryBoard {
  const clusters: StoryCluster[] = (db.prepare(`
    SELECT c.*, l.name AS location_name, q.name AS quest_name
    FROM story_clusters c
    LEFT JOIN entities l ON l.id = c.location_id AND l.deleted_at IS NULL
    LEFT JOIN entities q ON q.id = c.quest_id AND q.deleted_at IS NULL
    WHERE c.campaign_id = ?
    ORDER BY c.sort_order, c.id
  `).all(campaignId) as Array<Omit<StoryCluster, 'collapsed'> & { collapsed: number, campaign_id?: number, created_at?: string, updated_at?: string }>)
    .map(({ campaign_id: _c, created_at: _a, updated_at: _u, ...c }): StoryCluster => ({ ...c, entities: [], collapsed: !!c.collapsed, quest_id: c.quest_name ? c.quest_id : null }))

  const clusterLinks = db.prepare(`
    SELECT ce.cluster_id, e.id, e.name, et.name AS type
    FROM story_cluster_entities ce
    JOIN story_clusters c ON c.id = ce.cluster_id
    JOIN entities e ON e.id = ce.entity_id AND e.deleted_at IS NULL
    JOIN entity_types et ON et.id = e.type_id
    WHERE c.campaign_id = ?
    ORDER BY e.name COLLATE NOCASE
  `).all(campaignId) as Array<LinkedEntity & { cluster_id: number }>
  for (const { cluster_id, ...e } of clusterLinks) clusters.find(c => c.id === cluster_id)?.entities.push(e)

  const links = db.prepare(`
    SELECT be.beat_id, e.id, e.name, et.name AS type
    FROM story_beat_entities be
    JOIN story_beats b ON b.id = be.beat_id
    JOIN entities e ON e.id = be.entity_id AND e.deleted_at IS NULL
    JOIN entity_types et ON et.id = e.type_id
    WHERE b.campaign_id = ?
    ORDER BY e.name COLLATE NOCASE
  `).all(campaignId) as Array<LinkedEntity & { beat_id: number }>
  const linksByBeat = new Map<number, LinkedEntity[]>()
  for (const { beat_id, ...e } of links) linksByBeat.set(beat_id, [...(linksByBeat.get(beat_id) ?? []), e])

  const beats = (db.prepare(`
    SELECT b.id, b.cluster_id, b.title, b.body, b.kind, b.status, b.location_id, l.name AS location_name,
           b.sort_order, b.tray_order, b.played_session_id
    FROM story_beats b
    LEFT JOIN entities l ON l.id = b.location_id AND l.deleted_at IS NULL
    WHERE b.campaign_id = ?
    ORDER BY b.sort_order, b.id
  `).all(campaignId) as Omit<StoryBeat, 'entities'>[]).map(b => ({
    ...b,
    kind: oneOf(BEAT_KINDS, b.kind, 'scene'),
    status: oneOf(BEAT_STATUSES, b.status, 'idea'),
    entities: linksByBeat.get(b.id) ?? [],
  }))

  return { settings: getSettings(db, campaignId), storylines: loadStorylines(db, campaignId), clusters, beats }
}

export function loadBeat(db: Database.Database, id: number): StoryBeat | null {
  const row = db.prepare('SELECT campaign_id FROM story_beats WHERE id = ?').get(id) as { campaign_id: number } | undefined
  if (!row) return null
  return loadBoard(db, row.campaign_id).beats.find(b => b.id === id) ?? null
}

// ---------------------------------------------------------------------------
// Quests — entities of type "Quest"; status/giver/objectives live in metadata
// ---------------------------------------------------------------------------

export function questTypeId(db: Database.Database): number {
  const row = db.prepare('SELECT id FROM entity_types WHERE name = ?').get('Quest') as { id: number } | undefined
  if (!row) throw createError({ statusCode: 500, message: 'Quest entity type not found' })
  return row.id
}

export function loadQuests(db: Database.Database, campaignId: number, id?: number): Quest[] {
  const rows = db.prepare(`
    SELECT e.id, e.name, e.description, e.metadata, e.location_id, l.name AS location_name, e.updated_at
    FROM entities e
    LEFT JOIN entities l ON l.id = e.location_id AND l.deleted_at IS NULL
    WHERE e.type_id = ? AND e.campaign_id = ? AND e.deleted_at IS NULL ${id ? 'AND e.id = ?' : ''}
    ORDER BY e.name COLLATE NOCASE
  `).all(...(id ? [questTypeId(db), campaignId, id] : [questTypeId(db), campaignId])) as Array<{ id: number, name: string, description: string | null, metadata: string | null, location_id: number | null, location_name: string | null, updated_at: string }>
  const giverName = db.prepare('SELECT e.name, et.name AS type FROM entities e JOIN entity_types et ON et.id = e.type_id WHERE e.id = ? AND e.deleted_at IS NULL')
  const involved = db.prepare(`
    SELECT e.id, e.name, et.name AS type FROM entity_relations r
    JOIN entities e ON e.id = r.to_entity_id AND e.deleted_at IS NULL
    JOIN entity_types et ON et.id = e.type_id
    WHERE r.from_entity_id = ? AND r.relation_type = ?
    ORDER BY e.name COLLATE NOCASE
  `)
  return rows.map((r) => {
    const m = readQuestMetadata(r.metadata)
    const giver = m.giver_id ? giverName.get(m.giver_id) as { name: string, type: string } | undefined : undefined
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      ...m,
      giver_id: giver ? m.giver_id : null,
      giver_name: giver?.name ?? null,
      giver_type: giver?.type ?? null,
      involved: involved.all(r.id, QUEST_INVOLVED_RELATION) as LinkedEntity[],
      location_id: r.location_name ? r.location_id : null,
      location_name: r.location_name,
      updated_at: r.updated_at,
    }
  }).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
}

export function loadQuest(db: Database.Database, id: number): Quest | null {
  const row = db.prepare('SELECT campaign_id FROM entities WHERE id = ? AND type_id = ? AND deleted_at IS NULL').get(id, questTypeId(db)) as { campaign_id: number } | undefined
  return row ? loadQuests(db, row.campaign_id, id)[0] ?? null : null
}

// ---------------------------------------------------------------------------
// Faction agendas
// ---------------------------------------------------------------------------

export function loadAgendas(db: Database.Database, campaignId: number, factionId?: number): FactionAgenda[] {
  return db.prepare(`
    SELECT a.id, a.faction_id, f.name AS faction_name, a.goal, a.next_step, a.clock_size, a.clock_filled, a.status, a.sort_order
    FROM faction_agendas a
    JOIN entities f ON f.id = a.faction_id AND f.deleted_at IS NULL
    WHERE a.campaign_id = ? ${factionId ? 'AND a.faction_id = ?' : ''}
    ORDER BY CASE a.status WHEN 'active' THEN 0 ELSE 1 END, f.name COLLATE NOCASE, a.sort_order, a.id
  `).all(...(factionId ? [campaignId, factionId] : [campaignId])) as FactionAgenda[]
}

export function nextSortOrder(db: Database.Database, sql: string, ...params: unknown[]): number {
  const row = db.prepare(sql).get(...params) as { m: number | null } | undefined
  return (row?.m ?? -1) + 1
}

/** Replace the entries linked to a quest as "involved" (this campaign's only, not the quest itself). */
export function setQuestInvolved(db: Database.Database, campaignId: number, questId: number, ids: unknown) {
  if (!Array.isArray(ids)) return
  db.prepare('DELETE FROM entity_relations WHERE from_entity_id = ? AND relation_type = ?').run(questId, QUEST_INVOLVED_RELATION)
  const insert = db.prepare('INSERT OR IGNORE INTO entity_relations (from_entity_id, to_entity_id, relation_type) VALUES (?, ?, ?)')
  for (const id of ids) {
    const ok = entityInCampaign(db, campaignId, id)
    if (ok && ok !== questId) insert.run(questId, ok, QUEST_INVOLVED_RELATION)
  }
}

/** Replace the entries linked to a cluster (this campaign's only, deduped). */
export function setClusterEntities(db: Database.Database, campaignId: number, clusterId: number, ids: unknown) {
  if (!Array.isArray(ids)) return
  db.prepare('DELETE FROM story_cluster_entities WHERE cluster_id = ?').run(clusterId)
  const insert = db.prepare('INSERT OR IGNORE INTO story_cluster_entities (cluster_id, entity_id) VALUES (?, ?)')
  for (const id of ids) {
    const ok = entityInCampaign(db, campaignId, id)
    if (ok) insert.run(clusterId, ok)
  }
}

/** What a new beat in this cluster starts with: the cluster's entries plus its quest's involved entries. */
export function clusterDefaultEntityIds(db: Database.Database, clusterId: number): number[] {
  const rows = db.prepare(`
    SELECT entity_id AS id FROM story_cluster_entities WHERE cluster_id = ?
    UNION
    SELECT r.to_entity_id FROM story_clusters c JOIN entity_relations r ON r.from_entity_id = c.quest_id AND r.relation_type = ?
    WHERE c.id = ?
  `).all(clusterId, QUEST_INVOLVED_RELATION, clusterId) as Array<{ id: number }>
  return rows.map(r => r.id)
}
