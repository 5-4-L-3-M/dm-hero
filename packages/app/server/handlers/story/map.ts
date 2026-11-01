import { getDb } from '../../utils/db'
import { loadStoryMap, mapRefExists, requireCampaign, requireRow } from '../../utils/storyBoard'
import { MAP_EDGE_KINDS, MAP_NODE_KINDS, oneOf, type StoryMapEdge, type StoryMapNode } from '../../../types/story'

/**
 * Story map endpoints (mounted under /api/story/map):
 *   GET    map?campaignId            nodes + edges
 *   POST   map/nodes                 { campaignId, kind, ref_id, x, y, act? } — put a card on the map (existing one is moved)
 *   PATCH  map/nodes/:id             { x?, y?, act? }  (act: 1-based, null = none)
 *   DELETE map/nodes/:id             takes the card (and its arrows) off the map; the quest/cluster/beat stays
 *   POST   map/positions             { campaignId, nodes: [{ id, x, y }] } — after "Arrange"
 *   POST   map/edges                 { campaignId, from_node, to_node, label?, kind? } — leads (arrow) or related (dotted)
 *   PATCH  map/edges/:id             { label?, kind? }
 *   DELETE map/edges/:id
 */
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const act = (v: unknown) => (Number.isInteger(Number(v)) && Number(v) > 0 && v !== null && v !== '' ? Number(v) : null)
const node = (id: number | bigint) => getDb().prepare('SELECT id, kind, ref_id, x, y, act FROM story_map_nodes WHERE id = ?').get(Number(id)) as StoryMapNode
const edge = (id: number | bigint) => getDb().prepare('SELECT id, from_node, to_node, label, kind FROM story_map_edges WHERE id = ?').get(Number(id)) as StoryMapEdge

export const getMap = defineEventHandler((event) => {
  const db = getDb()
  return loadStoryMap(db, requireCampaign(db, getQuery(event).campaignId))
})

export const addNode = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const kind = oneOf(MAP_NODE_KINDS, body.kind, 'quest')
  if (body.kind !== kind || !mapRefExists(db, campaignId, kind, body.ref_id)) throw createError({ statusCode: 400, message: 'Unknown quest, cluster or beat' })
  db.prepare(`
    INSERT INTO story_map_nodes (campaign_id, kind, ref_id, x, y, act) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(campaign_id, kind, ref_id) DO UPDATE SET x = excluded.x, y = excluded.y, act = COALESCE(excluded.act, story_map_nodes.act)
  `).run(campaignId, kind, Number(body.ref_id), num(body.x), num(body.y), act(body.act))
  const row = db.prepare('SELECT id FROM story_map_nodes WHERE campaign_id = ? AND kind = ? AND ref_id = ?').get(campaignId, kind, Number(body.ref_id)) as { id: number }
  return node(row.id)
})

export const moveNode = defineEventHandler(async (event) => {
  const db = getDb()
  const row = requireRow(db, 'story_map_nodes', getRouterParam(event, 'id'))
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const cur = node(row.id)
  db.prepare('UPDATE story_map_nodes SET x = ?, y = ?, act = ? WHERE id = ?').run(
    has('x') ? num(body.x) : cur.x,
    has('y') ? num(body.y) : cur.y,
    has('act') ? act(body.act) : cur.act,
    row.id,
  )
  return node(row.id)
})

export const removeNode = defineEventHandler((event) => {
  const db = getDb()
  const row = requireRow(db, 'story_map_nodes', getRouterParam(event, 'id'))
  db.prepare('DELETE FROM story_map_nodes WHERE id = ?').run(row.id)
  return { ok: true }
})

export const savePositions = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{ campaignId: number, nodes?: Array<{ id: number, x: number, y: number }> }>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const set = db.prepare('UPDATE story_map_nodes SET x = ?, y = ? WHERE id = ? AND campaign_id = ?')
  db.transaction(() => (body.nodes ?? []).forEach(n => set.run(num(n.x), num(n.y), Number(n.id), campaignId)))()
  return { ok: true }
})

export const addEdge = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const from = Number(body.from_node)
  const to = Number(body.to_node)
  const inCampaign = db.prepare('SELECT 1 FROM story_map_nodes WHERE id = ? AND campaign_id = ?')
  if (from === to || !inCampaign.get(from, campaignId) || !inCampaign.get(to, campaignId)) throw createError({ statusCode: 400, message: 'Pick two different cards on this map' })
  db.prepare(`
    INSERT INTO story_map_edges (campaign_id, from_node, to_node, label, kind) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(from_node, to_node) DO UPDATE SET label = COALESCE(excluded.label, story_map_edges.label), kind = excluded.kind
  `).run(campaignId, from, to, text(body.label), oneOf(MAP_EDGE_KINDS, body.kind, 'leads'))
  const row = db.prepare('SELECT id FROM story_map_edges WHERE from_node = ? AND to_node = ?').get(from, to) as { id: number }
  return edge(row.id)
})

export const updateEdge = defineEventHandler(async (event) => {
  const db = getDb()
  const row = requireRow(db, 'story_map_edges', getRouterParam(event, 'id'))
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const cur = edge(row.id)
  db.prepare('UPDATE story_map_edges SET label = ?, kind = ? WHERE id = ?').run(
    has('label') ? text(body.label) : cur.label,
    has('kind') ? oneOf(MAP_EDGE_KINDS, body.kind, cur.kind) : cur.kind,
    row.id,
  )
  return edge(row.id)
})

export const removeEdge = defineEventHandler((event) => {
  const db = getDb()
  const row = requireRow(db, 'story_map_edges', getRouterParam(event, 'id'))
  db.prepare('DELETE FROM story_map_edges WHERE id = ?').run(row.id)
  return { ok: true }
})
