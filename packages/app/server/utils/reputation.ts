import type Database from 'better-sqlite3'
import { nextSortOrder } from './storyBoard'
import {
  PRICE_BY_TIER, rippleShare, tierOf,
  type RepEvent, type RepKind, type RepRipple, type RepSubjectType, type RepTrack, type Reputation,
} from '../../types/reputation'

const SETTLEMENT_TYPES = ['city', 'town', 'village']
const NOT_A_MEMBER = ['enemy', 'former', 'prisoner']
const ALLY_TYPES = ['allied', 'secret_ally', 'trade_partner', 'vassal', 'overlord', 'parent_org', 'subsidiary', 'truce']
const RIVAL_TYPES = ['rival', 'hostile', 'at_war']

function meta(raw: string | null | undefined): Record<string, unknown> {
  try {
    const v = raw ? JSON.parse(raw) : null
    return v && typeof v === 'object' ? v as Record<string, unknown> : {}
  }
  catch {
    return {}
  }
}

interface Subject { id: number, name: string, type: RepSubjectType, metadata: string | null, location_id: number | null, parent_entity_id: number | null }

/** An NPC, faction or place of this campaign (not deleted), or null */
export function repSubject(db: Database.Database, campaignId: number, id: unknown): Subject | null {
  const row = db.prepare(`
    SELECT e.id, e.name, et.name AS type, e.metadata, e.location_id, e.parent_entity_id
    FROM entities e JOIN entity_types et ON et.id = e.type_id
    WHERE e.id = ? AND e.campaign_id = ? AND e.deleted_at IS NULL AND et.name IN ('NPC', 'Faction', 'Location')
  `).get(Number(id), campaignId) as Subject | undefined
  return row ?? null
}

function playerOf(db: Database.Database, campaignId: number, id: unknown): { id: number, name: string } | null {
  if (!Number(id)) return null
  return db.prepare(`
    SELECT e.id, e.name FROM entities e JOIN entity_types et ON et.id = e.type_id
    WHERE e.id = ? AND e.campaign_id = ? AND et.name = 'Player' AND e.deleted_at IS NULL
  `).get(Number(id), campaignId) as { id: number, name: string } | undefined ?? null
}

export function trackPoints(db: Database.Database, campaignId: number, subjectId: number, playerId: number, kind: RepKind): number {
  const row = db.prepare('SELECT COALESCE(SUM(delta), 0) AS p FROM rep_events WHERE campaign_id = ? AND subject_id = ? AND player_id = ? AND kind = ?')
    .get(campaignId, subjectId, playerId, kind) as { p: number }
  return kind === 'notoriety' ? Math.max(0, row.p) : row.p
}

/** All tracks (or one subject's), with points, tier and when they last moved; plus met NPCs */
export function loadReputation(db: Database.Database, campaignId: number, subjectId?: number): Reputation {
  const where = subjectId ? 'AND x.subject_id = ?' : ''
  const params: number[] = subjectId ? [campaignId, campaignId, subjectId] : [campaignId, campaignId]
  const rows = db.prepare(`
    SELECT x.subject_id, x.player_id, x.kind, e.name AS subject_name, et.name AS subject_type, p.name AS player_name,
      (SELECT COALESCE(SUM(delta), 0) FROM rep_events r WHERE r.campaign_id = x.campaign_id AND r.subject_id = x.subject_id AND r.player_id = x.player_id AND r.kind = x.kind) AS points,
      (SELECT MAX(created_at) FROM rep_events r WHERE r.campaign_id = x.campaign_id AND r.subject_id = x.subject_id AND r.player_id = x.player_id AND r.kind = x.kind) AS last_change
    FROM (
      SELECT campaign_id, subject_id, player_id, kind FROM rep_events WHERE campaign_id = ?
      UNION SELECT campaign_id, subject_id, player_id, kind FROM rep_tracks WHERE campaign_id = ?
    ) x
    JOIN entities e ON e.id = x.subject_id AND e.deleted_at IS NULL
    JOIN entity_types et ON et.id = e.type_id
    LEFT JOIN entities p ON p.id = x.player_id
    WHERE 1 = 1 ${where}
    ORDER BY e.name COLLATE NOCASE, x.player_id
  `).all(...params) as Array<Omit<RepTrack, 'tier'>>
  const tracks: RepTrack[] = rows.map((r) => {
    const points = r.kind === 'notoriety' ? Math.max(0, r.points) : r.points
    return { ...r, points, player_name: r.player_id ? r.player_name : null, tier: tierOf(points, r.subject_type, r.kind).key }
  })
  const met = db.prepare(`
    SELECT e.id, e.name FROM entities e JOIN entity_types et ON et.id = e.type_id
    WHERE e.campaign_id = ? AND et.name = 'NPC' AND e.deleted_at IS NULL AND json_extract(e.metadata, '$.met') = 1
    ${subjectId ? 'AND e.id = ?' : ''}
    ORDER BY e.name COLLATE NOCASE
  `).all(...(subjectId ? [campaignId, subjectId] : [campaignId])) as Array<{ id: number, name: string }>
  return { tracks, met }
}

export function loadRepEvents(db: Database.Database, campaignId: number, subjectId: number, playerId?: number, kind?: RepKind): RepEvent[] {
  const extra = [playerId !== undefined ? 'AND r.player_id = ?' : '', kind ? 'AND r.kind = ?' : ''].join(' ')
  const params: Array<number | string> = [campaignId, subjectId]
  if (playerId !== undefined) params.push(playerId)
  if (kind) params.push(kind)
  return db.prepare(`
    SELECT r.id, r.subject_id, e.name AS subject_name, r.player_id, p.name AS player_name, r.kind, r.delta, r.reason, r.preset,
           r.session_id, CASE WHEN s.id IS NULL THEN NULL WHEN s.session_number IS NOT NULL THEN '#' || s.session_number || ' ' || s.title ELSE s.title END AS session_label,
           r.source_event_id, r.created_at
    FROM rep_events r
    JOIN entities e ON e.id = r.subject_id
    LEFT JOIN entities p ON p.id = r.player_id
    LEFT JOIN sessions s ON s.id = r.session_id
    WHERE r.campaign_id = ? AND r.subject_id = ? ${extra}
    ORDER BY r.created_at DESC, r.id DESC
  `).all(...params) as RepEvent[]
}

/** Nearest city / town / village at or above a place */
function settlementOf(db: Database.Database, campaignId: number, locationId: number | null): Subject | null {
  const seen = new Set<number>()
  let cur = locationId ? repSubject(db, campaignId, locationId) : null
  let top: Subject | null = null
  while (cur && cur.type === 'Location' && !seen.has(cur.id)) {
    seen.add(cur.id)
    if (SETTLEMENT_TYPES.includes(String(meta(cur.metadata).type))) return cur
    top = cur
    cur = cur.parent_entity_id ? repSubject(db, campaignId, cur.parent_entity_id) : null
  }
  return top
}

function relationsBetween(db: Database.Database, id: number, otherType: string): Array<{ other_id: number, other_name: string, relation_type: string | null }> {
  return db.prepare(`
    SELECT o.id AS other_id, o.name AS other_name, r.relation_type
    FROM entity_relations r
    JOIN entities o ON o.id = CASE WHEN r.from_entity_id = ? THEN r.to_entity_id ELSE r.from_entity_id END
    JOIN entity_types et ON et.id = o.type_id AND et.name = ?
    WHERE (r.from_entity_id = ? OR r.to_entity_id = ?) AND o.deleted_at IS NULL
  `).all(id, otherType, id, id) as Array<{ other_id: number, other_name: string, relation_type: string | null }>
}

/**
 * What else a change should move: an NPC's factions (half) and city (a third),
 * a faction's allies (half) and rivals (minus half), a place's city (half).
 */
export function suggestRipples(db: Database.Database, campaignId: number, subjectId: number, delta: number, kind: RepKind = 'rep'): RepRipple[] {
  const s = repSubject(db, campaignId, subjectId)
  if (!s || kind !== 'rep' || !delta) return []
  const out: RepRipple[] = []
  const add = (id: number, name: string, type: RepSubjectType, d: number, why: RepRipple['why']) => {
    if (id !== s.id && !out.some(r => r.subject_id === id)) out.push({ subject_id: id, subject_type: type, subject_name: name, delta: d, why })
  }
  if (s.type === 'NPC') {
    for (const f of relationsBetween(db, s.id, 'Faction')) {
      if (!NOT_A_MEMBER.includes((f.relation_type ?? '').toLowerCase())) add(f.other_id, f.other_name, 'Faction', rippleShare(delta, 2), 'faction')
    }
    const home = s.location_id ?? relationsBetween(db, s.id, 'Location')[0]?.other_id ?? null
    const city = settlementOf(db, campaignId, home)
    if (city) add(city.id, city.name, 'Location', rippleShare(delta, 3), 'settlement')
  }
  else if (s.type === 'Faction') {
    for (const f of relationsBetween(db, s.id, 'Faction')) {
      const t = (f.relation_type ?? '').toLowerCase()
      if (ALLY_TYPES.includes(t)) add(f.other_id, f.other_name, 'Faction', rippleShare(delta, 2), 'ally')
      else if (RIVAL_TYPES.includes(t)) add(f.other_id, f.other_name, 'Faction', -rippleShare(delta, 2), 'rival')
    }
  }
  else if (!SETTLEMENT_TYPES.includes(String(meta(s.metadata).type))) {
    const city = settlementOf(db, campaignId, s.parent_entity_id)
    if (city) add(city.id, city.name, 'Location', rippleShare(delta, 2), 'settlement')
  }
  return out
}

function settings(db: Database.Database, campaignId: number) {
  const row = db.prepare('SELECT rep_consequences, rep_rumors FROM story_board_settings WHERE campaign_id = ?').get(campaignId) as { rep_consequences: number, rep_rumors: number } | undefined
  return { consequences: row ? !!row.rep_consequences : true, rumors: row ? !!row.rep_rumors : true }
}

/** A loose idea on the sparks shelf (the world reacting) */
export function addSpark(db: Database.Database, campaignId: number, title: string, body: string | null, locationId: number | null = null) {
  const order = nextSortOrder(db, 'SELECT MAX(sort_order) AS m FROM story_beats WHERE campaign_id = ? AND cluster_id IS NULL', campaignId)
  db.prepare("INSERT INTO story_beats (campaign_id, cluster_id, title, body, kind, status, location_id, sort_order) VALUES (?, NULL, ?, ?, 'hook', 'idea', ?, ?)")
    .run(campaignId, title, body, locationId, order)
}

/** What the world does when a bar crosses into a new tier (the spark is editable like any other) */
const REACTIONS: Record<string, string> = {
  // groups
  hated: '{name} wants the party gone',
  disliked: '{name} starts giving the party trouble',
  neutral: '{name} has gone back to not caring about the party',
  liked: '{name} offers the party a small favor',
  honored: '{name} invites the party into their confidence',
  revered: '{name} would stand with the party against anyone',
  // NPCs
  hostile: '{name} wants to get back at the party',
  unfriendly: '{name} starts avoiding the party',
  indifferent: '{name} cools off toward the party',
  friendly: '{name} warms to the party',
  allied: '{name} would take a real risk for the party',
  // notoriety
  noticed: 'The guard in {name} has noticed the party',
  suspected: 'The guard in {name} starts asking about the party',
  wanted: 'The party is wanted in {name}',
  hunted: '{name} sends people to hunt the party down',
  unknown: 'The guard in {name} has forgotten about the party',
}

export interface LogInput {
  subject_id: number
  player_id?: number
  kind?: RepKind
  delta: number
  reason?: string | null
  preset?: string | null
  session_id?: number | null
  ripples?: Array<{ subject_id: number, delta: number }>
}

function newestSession(db: Database.Database, campaignId: number): number | null {
  const row = db.prepare('SELECT id FROM sessions WHERE campaign_id = ? ORDER BY COALESCE(session_number, 0) DESC, id DESC LIMIT 1').get(campaignId) as { id: number } | undefined
  return row?.id ?? null
}

/** Mark an NPC as met (and in which session) — or not */
export function setMet(db: Database.Database, campaignId: number, npcId: number, met: boolean, sessionId: number | null = null) {
  const row = db.prepare(`
    SELECT e.metadata FROM entities e JOIN entity_types et ON et.id = e.type_id
    WHERE e.id = ? AND e.campaign_id = ? AND et.name = 'NPC' AND e.deleted_at IS NULL
  `).get(npcId, campaignId) as { metadata: string | null } | undefined
  if (!row) return false
  const m = meta(row.metadata)
  if (!!m.met === met) return true
  if (met) {
    m.met = true
    m.met_session_id = sessionId ?? newestSession(db, campaignId)
  }
  else {
    delete m.met
    delete m.met_session_id
  }
  db.prepare('UPDATE entities SET metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(m), npcId)
  return true
}

/**
 * Log a change (and its ripples) in one go. Crossing into a new tier and big
 * moments drop sparks on the board (if those are switched on). Returns the
 * new event id and what the world did.
 */
export function logRepEvent(db: Database.Database, campaignId: number, input: LogInput): { id: number, reactions: string[] } {
  const kind: RepKind = input.kind === 'notoriety' ? 'notoriety' : 'rep'
  const main = repSubject(db, campaignId, input.subject_id)
  if (!main) throw createError({ statusCode: 400, message: 'Unknown NPC, faction or place' })
  const delta = Math.round(Number(input.delta))
  if (!delta) throw createError({ statusCode: 400, message: 'The change needs points' })
  const playerId = input.player_id ? playerOf(db, campaignId, input.player_id)?.id ?? 0 : 0
  const sessionId = input.session_id === undefined ? newestSession(db, campaignId) : (input.session_id ? Number(input.session_id) : null)
  const reason = typeof input.reason === 'string' && input.reason.trim() ? input.reason.trim() : null
  const cfg = settings(db, campaignId)
  const reactions: string[] = []

  return db.transaction(() => {
    const insert = db.prepare('INSERT INTO rep_events (campaign_id, subject_id, player_id, kind, delta, reason, preset, session_id, source_event_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const apply = (s: Subject, pid: number, d: number, source: number | null, why: string | null) => {
      const before = trackPoints(db, campaignId, s.id, pid, kind)
      const id = Number(insert.run(campaignId, s.id, pid, kind, d, why, source ? null : (input.preset ?? null), sessionId, source).lastInsertRowid)
      const after = trackPoints(db, campaignId, s.id, pid, kind)
      const t0 = tierOf(before, s.type, kind)
      const t1 = tierOf(after, s.type, kind)
      if (cfg.consequences && pid === 0 && t0.key !== t1.key) {
        const title = (REACTIONS[t1.key] ?? '{name} feels differently about the party').replace('{name}', s.name)
        reactions.push(title)
        addSpark(db, campaignId, title, reason ? `Because: ${reason}` : null, s.type === 'Location' ? s.id : null)
      }
      return id
    }
    const id = apply(main, playerId, delta, null, reason)
    for (const r of input.ripples ?? []) {
      const s = repSubject(db, campaignId, r.subject_id)
      const d = Math.round(Number(r.delta))
      if (s && s.id !== main.id && d) apply(s, 0, d, id, reason ? `${reason} (via ${main.name})` : `via ${main.name}`)
    }
    // Rumor mill: big moments get talked about
    if (cfg.rumors && Math.abs(delta) >= 5 && reason) {
      const city = main.type === 'Location' ? settlementOf(db, campaignId, main.id) : main.type === 'NPC' ? settlementOf(db, campaignId, main.location_id) : null
      const title = `Rumor${city ? ` in ${city.name}` : ''}: ${reason}`
      reactions.push(title)
      addSpark(db, campaignId, title, `Word is getting around (${main.name}, ${delta > 0 ? '+' : ''}${delta}).`, city?.id ?? null)
    }
    if (main.type === 'NPC') setMet(db, campaignId, main.id, true, sessionId)
    return { id, reactions }
  })()
}

/** Percent price change at a shop: the shop's own standing, else its city's */
export function priceAdjustment(db: Database.Database, campaignId: number, locationId: number): { pct: number, tier: string | null, from: string | null } {
  const has = (id: number) => !!db.prepare("SELECT 1 FROM rep_events WHERE campaign_id = ? AND subject_id = ? AND player_id = 0 AND kind = 'rep' LIMIT 1").get(campaignId, id)
  const shop = repSubject(db, campaignId, locationId)
  if (!shop) return { pct: 0, tier: null, from: null }
  const source = has(shop.id) ? shop : (() => {
    const city = settlementOf(db, campaignId, shop.parent_entity_id)
    return city && has(city.id) ? city : null
  })()
  if (!source) return { pct: 0, tier: null, from: null }
  const tier = tierOf(trackPoints(db, campaignId, source.id, 0, 'rep'), source.type, 'rep').key
  return { pct: PRICE_BY_TIER[tier] ?? 0, tier, from: source.name }
}

export interface WorldTurn {
  agendas: Array<{ faction: string, goal: string, filled: number, size: number, done: boolean }>
  cooled: Array<{ place: string, notoriety: number }>
  sparks: number
}

/**
 * Advance the world between sessions: each active faction plan has a 50%
 * chance to tick (a full clock comes to a head), notoriety cools by 1.
 */
export function advanceWorld(db: Database.Database, campaignId: number, roll: () => number = Math.random): WorldTurn {
  const cfg = settings(db, campaignId)
  const turn: WorldTurn = { agendas: [], cooled: [], sparks: 0 }
  db.transaction(() => {
    const agendas = db.prepare(`
      SELECT a.id, a.goal, a.next_step, a.clock_size, a.clock_filled, f.name AS faction
      FROM faction_agendas a JOIN entities f ON f.id = a.faction_id AND f.deleted_at IS NULL
      WHERE a.campaign_id = ? AND a.status = 'active' AND a.clock_filled < a.clock_size
    `).all(campaignId) as Array<{ id: number, goal: string, next_step: string | null, clock_size: number, clock_filled: number, faction: string }>
    for (const a of agendas) {
      if (roll() < 0.5) continue
      const filled = a.clock_filled + 1
      db.prepare('UPDATE faction_agendas SET clock_filled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(filled, a.id)
      const done = filled >= a.clock_size
      turn.agendas.push({ faction: a.faction, goal: a.goal, filled, size: a.clock_size, done })
      if (done) {
        addSpark(db, campaignId, `${a.faction}'s plan comes to a head: ${a.goal}`, a.next_step ? `Last step: ${a.next_step}` : null)
        turn.sparks++
      }
      else if (cfg.rumors) {
        addSpark(db, campaignId, `Rumor: ${a.faction} is up to something`, a.next_step ? `What's really happening: ${a.next_step}` : `Toward: ${a.goal}`)
        turn.sparks++
      }
    }
    const hot = db.prepare(`
      SELECT r.subject_id, e.name, SUM(r.delta) AS p FROM rep_events r JOIN entities e ON e.id = r.subject_id
      WHERE r.campaign_id = ? AND r.kind = 'notoriety' AND r.player_id = 0 GROUP BY r.subject_id HAVING p > 0
    `).all(campaignId) as Array<{ subject_id: number, name: string, p: number }>
    for (const h of hot) {
      db.prepare("INSERT INTO rep_events (campaign_id, subject_id, player_id, kind, delta, reason, preset) VALUES (?, ?, 0, 'notoriety', -1, 'Cooled down over time', 'cooldown')").run(campaignId, h.subject_id)
      turn.cooled.push({ place: h.name, notoriety: h.p - 1 })
    }
  })()
  return turn
}
