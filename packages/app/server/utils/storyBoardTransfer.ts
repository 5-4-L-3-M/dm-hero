import type Database from 'better-sqlite3'
import type { ExportStoryBoard } from '../../types/export'
import { readQuestMetadata } from '../../types/story'

interface ClusterRow {
  id: number
  storyline_id: number | null
  title: string
  notes: string | null
  heat: string
  status: string
  location_id: number | null
  quest_id: number | null
  collapsed: number
  sort_order: number
}

interface BeatRow {
  id: number
  cluster_id: number | null
  title: string
  body: string | null
  kind: string
  status: string
  location_id: number | null
  sort_order: number
  tray_order: number | null
  played_session_id: number | null
}

interface AgendaRow {
  faction_id: number
  goal: string
  next_step: string | null
  clock_size: number
  clock_filled: number
  status: string
  sort_order: number
}

/**
 * Story Board in campaign export / import. Entities and sessions are
 * referenced by their export ids; anything pointing at something that wasn't
 * exported is dropped (the link, not the row).
 */
export function exportStoryBoard(
  db: Database.Database,
  campaignId: number,
  entityRef: Map<number, string>,
  sessionRef: Map<number, string>,
): ExportStoryBoard | undefined {
  const ref = (map: Map<number, string>, id: number | null) => (id ? map.get(id) ?? null : null)

  const lines = db.prepare('SELECT * FROM story_lines WHERE campaign_id = ? ORDER BY sort_order, id').all(campaignId) as Array<{ id: number, name: string, color: number, sort_order: number }>
  const lineRef = new Map(lines.map((l, i) => [l.id, `line:${i + 1}`]))

  const clusters = db.prepare('SELECT * FROM story_clusters WHERE campaign_id = ? ORDER BY sort_order, id').all(campaignId) as ClusterRow[]
  const clusterRef = new Map(clusters.map((c, i) => [c.id, `cluster:${i + 1}`]))

  const beats = db.prepare('SELECT * FROM story_beats WHERE campaign_id = ? ORDER BY sort_order, id').all(campaignId) as BeatRow[]
  const links = db.prepare('SELECT be.beat_id, be.entity_id FROM story_beat_entities be JOIN story_beats b ON b.id = be.beat_id WHERE b.campaign_id = ?').all(campaignId) as Array<{ beat_id: number, entity_id: number }>

  const agendas = db.prepare('SELECT * FROM faction_agendas WHERE campaign_id = ? ORDER BY sort_order, id').all(campaignId) as AgendaRow[]

  const quests = db.prepare(`
    SELECT e.id, e.metadata FROM entities e JOIN entity_types et ON et.id = e.type_id
    WHERE et.name = 'Quest' AND e.campaign_id = ? AND e.deleted_at IS NULL
  `).all(campaignId) as Array<{ id: number, metadata: string | null }>

  const settings = db.prepare('SELECT color_by, party_location_id, group_by, compact FROM story_board_settings WHERE campaign_id = ?').get(campaignId) as { color_by: string, party_location_id: number | null, group_by: string, compact: number } | undefined
  const clusterLinks = db.prepare('SELECT ce.cluster_id, ce.entity_id FROM story_cluster_entities ce JOIN story_clusters c ON c.id = ce.cluster_id WHERE c.campaign_id = ?').all(campaignId) as Array<{ cluster_id: number, entity_id: number }>

  if (!lines.length && !clusters.length && !beats.length && !agendas.length && !quests.length && !settings) return undefined

  return {
    settings: settings ? { color_by: settings.color_by, party_location: ref(entityRef, settings.party_location_id), group_by: settings.group_by, compact: !!settings.compact } : undefined,
    storylines: lines.map(l => ({ ref: lineRef.get(l.id)!, name: l.name, color: l.color, sort_order: l.sort_order })),
    clusters: clusters.map(c => ({
      ref: clusterRef.get(c.id)!,
      storyline: c.storyline_id ? lineRef.get(c.storyline_id) ?? null : null,
      title: c.title,
      notes: c.notes,
      heat: c.heat,
      status: c.status,
      location: ref(entityRef, c.location_id),
      quest: ref(entityRef, c.quest_id),
      collapsed: !!c.collapsed,
      sort_order: c.sort_order,
      entities: clusterLinks.filter(l => l.cluster_id === c.id).map(l => entityRef.get(l.entity_id)).filter((x): x is string => !!x),
    })),
    beats: beats.map(b => ({
      cluster: b.cluster_id ? clusterRef.get(b.cluster_id) ?? null : null,
      title: b.title,
      body: b.body,
      kind: b.kind,
      status: b.status,
      location: ref(entityRef, b.location_id),
      sort_order: b.sort_order,
      tray_order: b.tray_order,
      played_session: ref(sessionRef, b.played_session_id),
      entities: links.filter(l => l.beat_id === b.id).map(l => entityRef.get(l.entity_id)).filter((x): x is string => !!x),
    })),
    agendas: agendas
      .filter(a => entityRef.has(a.faction_id))
      .map(a => ({ faction: entityRef.get(a.faction_id)!, goal: a.goal, next_step: a.next_step, clock_size: a.clock_size, clock_filled: a.clock_filled, status: a.status, sort_order: a.sort_order })),
    quests: quests
      .filter(q => entityRef.has(q.id))
      .map((q) => {
        const m = readQuestMetadata(q.metadata)
        return { quest: entityRef.get(q.id)!, giver: ref(entityRef, m.giver_id), storyline: m.storyline_id ? lineRef.get(m.storyline_id) ?? null : null }
      }),
  }
}

export function importStoryBoard(
  db: Database.Database,
  campaignId: number,
  data: ExportStoryBoard,
  entityId: Map<string, number>,
  sessionId: Map<string, number>,
) {
  const id = (map: Map<string, number>, r: string | null | undefined) => (r ? map.get(r) ?? null : null)

  if (data.settings) {
    db.prepare(`
      INSERT INTO story_board_settings (campaign_id, color_by, party_location_id, group_by, compact) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(campaign_id) DO UPDATE SET color_by = excluded.color_by, party_location_id = excluded.party_location_id,
        group_by = excluded.group_by, compact = excluded.compact
    `).run(campaignId, data.settings.color_by || 'storyline', id(entityId, data.settings.party_location), data.settings.group_by || 'storyline', data.settings.compact ? 1 : 0)
  }

  const lineId = new Map<string, number>()
  const insertLine = db.prepare('INSERT INTO story_lines (campaign_id, name, color, sort_order) VALUES (?, ?, ?, ?)')
  for (const l of data.storylines ?? []) {
    lineId.set(l.ref, Number(insertLine.run(campaignId, l.name, l.color || 1, l.sort_order || 0).lastInsertRowid))
  }

  const clusterId = new Map<string, number>()
  const insertCluster = db.prepare(`
    INSERT INTO story_clusters (campaign_id, storyline_id, title, notes, heat, status, location_id, quest_id, collapsed, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const c of data.clusters ?? []) {
    const r = insertCluster.run(campaignId, id(lineId, c.storyline), c.title, c.notes ?? null, c.heat || 'warm', c.status || 'active', id(entityId, c.location), id(entityId, c.quest), c.collapsed ? 1 : 0, c.sort_order || 0)
    clusterId.set(c.ref, Number(r.lastInsertRowid))
    for (const e of c.entities ?? []) {
      const eid = entityId.get(e)
      if (eid) db.prepare('INSERT OR IGNORE INTO story_cluster_entities (cluster_id, entity_id) VALUES (?, ?)').run(Number(r.lastInsertRowid), eid)
    }
  }

  const insertBeat = db.prepare(`
    INSERT INTO story_beats (campaign_id, cluster_id, title, body, kind, status, location_id, sort_order, tray_order, played_session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertLink = db.prepare('INSERT OR IGNORE INTO story_beat_entities (beat_id, entity_id) VALUES (?, ?)')
  for (const b of data.beats ?? []) {
    const beat = Number(insertBeat.run(
      campaignId, id(clusterId, b.cluster), b.title, b.body ?? null, b.kind || 'scene', b.status || 'idea',
      id(entityId, b.location), b.sort_order || 0, b.tray_order ?? null, id(sessionId, b.played_session),
    ).lastInsertRowid)
    for (const e of b.entities ?? []) {
      const eid = entityId.get(e)
      if (eid) insertLink.run(beat, eid)
    }
  }

  const insertAgenda = db.prepare(`
    INSERT INTO faction_agendas (campaign_id, faction_id, goal, next_step, clock_size, clock_filled, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const a of data.agendas ?? []) {
    const faction = entityId.get(a.faction)
    if (faction) insertAgenda.run(campaignId, faction, a.goal, a.next_step ?? null, a.clock_size || 6, a.clock_filled || 0, a.status || 'active', a.sort_order || 0)
  }

  // Quest metadata: point giver / storyline at the new ids
  const getMeta = db.prepare('SELECT metadata FROM entities WHERE id = ?')
  const setMeta = db.prepare('UPDATE entities SET metadata = ? WHERE id = ?')
  for (const q of data.quests ?? []) {
    const quest = entityId.get(q.quest)
    if (!quest) continue
    let meta: Record<string, unknown> = {}
    try {
      meta = JSON.parse((getMeta.get(quest) as { metadata: string | null } | undefined)?.metadata ?? '{}') ?? {}
    }
    catch {
      meta = {}
    }
    setMeta.run(JSON.stringify({ ...meta, giver_id: id(entityId, q.giver), storyline_id: id(lineId, q.storyline) }), quest)
  }
}
