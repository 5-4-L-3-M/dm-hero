import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { getTestDb } from '../utils/test-db'
import {
  clampClock, clusterColor, nearbyLocationIds, nextStoryColor, readQuestMetadata,
  type FactionAgenda, type Quest, type Questline, type StoryBeat, type StoryBoard, type StoryCluster, type StoryLine, type StoryMap, type StoryMapEdge, type StoryMapNode,
} from '../../types/story'
import { matchSubRoute } from '../../server/utils/subRouter'

// Story Board: storylines → clusters → beats, sparks shelf, tray, quests, agendas
let db: Database.Database

vi.mock('../../server/utils/db', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../server/utils/db')>()
  return { ...original, getDb: () => db }
})

interface FakeEvent { method: string, context: { params: Record<string, string> }, body?: unknown, query?: Record<string, unknown> }

beforeAll(() => {
  const g = globalThis as Record<string, unknown>
  g.defineEventHandler = (handler: unknown) => handler
  g.readBody = async (e: FakeEvent) => e.body
  g.getQuery = (e: FakeEvent) => e.query ?? {}
  g.getRouterParam = (e: FakeEvent, name: string) => e.context.params[name]
  g.createError = (o: { statusCode: number, message: string }) => Object.assign(new Error(o.message), { statusCode: o.statusCode })
})

let campaignId: number
const typeId = (name: string) => (db.prepare('SELECT id FROM entity_types WHERE name = ?').get(name) as { id: number }).id
function entity(type: string, name: string, parent: number | null = null): number {
  return Number(db.prepare('INSERT INTO entities (type_id, campaign_id, name, parent_entity_id) VALUES (?, ?, ?, ?)').run(typeId(type), campaignId, name, parent).lastInsertRowid)
}

beforeEach(() => {
  db = getTestDb()
  campaignId = Number(db.prepare('INSERT INTO campaigns (name) VALUES (?)').run('Aevum').lastInsertRowid)
})

async function story<T>(method: string, path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
  const handler = (await import('../../server/api/story/[...path]')).default as unknown as (e: FakeEvent) => Promise<T>
  return await handler({ method, context: { params: { path } }, body, query })
}
async function quests<T>(method: string, path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
  const handler = (await import('../../server/api/quests/[...path]')).default as unknown as (e: FakeEvent) => Promise<T>
  return await handler({ method, context: { params: { path } }, body, query })
}
const board = () => story<StoryBoard>('GET', 'board', undefined, { campaignId })

describe('story board helpers', () => {
  it('colors a cluster by the chosen parameter, always with theme color names', () => {
    const lines = [{ id: 1, color: 3 }]
    const c = { storyline_id: 1, heat: 'hot' as const, status: 'dormant' as const, location_id: 42 }
    expect(clusterColor(c, 'storyline', lines)).toBe('story-3')
    expect(clusterColor({ ...c, storyline_id: null }, 'storyline', lines)).toBe('surface-variant')
    expect(clusterColor(c, 'heat', lines)).toBe('error')
    expect(clusterColor(c, 'status', lines)).toBe('warning')
    expect(clusterColor(c, 'region', lines, [7, 42])).toBe('story-2')
  })

  it('finds the places near the party: where they are, what is inside it, what it is inside', () => {
    const locations = [
      { id: 1, parent_id: null }, // continent
      { id: 2, parent_id: 1 }, // region
      { id: 3, parent_id: 2 }, // city (party here)
      { id: 4, parent_id: 3 }, // tavern
      { id: 5, parent_id: 1 }, // other region
    ]
    expect([...nearbyLocationIds(3, locations)].sort()).toEqual([1, 2, 3, 4])
    expect(nearbyLocationIds(null, locations).size).toBe(0)
  })

  it('clamps clocks, picks unused storyline colors, reads quest metadata safely', () => {
    expect(clampClock(9, 6)).toEqual({ size: 6, filled: 6 })
    expect(clampClock(-1, 5)).toEqual({ size: 6, filled: 0 })
    expect(nextStoryColor([1, 2, 4])).toBe(3)
    expect(nextStoryColor([1, 2, 3, 4, 5, 6])).toBe(7)
    expect(nextStoryColor([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe(1)
    expect(readQuestMetadata('{"status":"bogus","objectives":["Find the key",{"text":"","done":true}]}')).toMatchObject({
      status: 'rumor',
      objectives: [{ text: 'Find the key', done: false }],
    })
    expect(readQuestMetadata('not json').status).toBe('rumor')
  })

  it('sub-router matches patterns and params', () => {
    const h = (() => null) as never
    const routes = { 'beats': { POST: h }, 'beats/:id': { PATCH: h } }
    expect(matchSubRoute(routes, 'PATCH', 'beats/12')?.params).toEqual({ id: '12' })
    expect(matchSubRoute(routes, 'GET', 'nope')).toBeNull()
    expect(() => matchSubRoute(routes, 'GET', 'beats')).toThrow()
  })
})

describe('story board API', () => {
  it('builds a board: storyline → cluster → beats with links, sparks and the tray', async () => {
    const line = await story<StoryLine>('POST', 'storylines', { campaignId, name: 'The Drowned Crown' })
    expect(line.color).toBe(1)
    const second = await story<StoryLine>('POST', 'storylines', { campaignId, name: 'Court Intrigue' })
    expect(second.color).toBe(2)

    const harbor = entity('Location', 'Harbor')
    const npc = entity('NPC', 'Captain Vey')
    const cluster = await story<StoryCluster>('POST', 'clusters', { campaignId, title: 'Smugglers', storyline_id: line.id, heat: 'hot', location_id: harbor })
    expect(cluster).toMatchObject({ title: 'Smugglers', heat: 'hot', location_name: 'Harbor', collapsed: false })

    const beat = await story<StoryBeat>('POST', 'beats', { campaignId, title: 'Ambush at the docks', cluster_id: cluster.id, kind: 'combat', entity_ids: [npc, 999999], in_tray: true })
    expect(beat.entities).toEqual([{ id: npc, name: 'Captain Vey', type: 'NPC' }])
    expect(beat.tray_order).toBe(0)
    const spark = await story<StoryBeat>('POST', 'beats', { campaignId, title: 'A gull with a message' })
    expect(spark.cluster_id).toBeNull()

    // Drag the spark into the cluster, above the ambush
    await story('POST', 'order', { campaignId, lists: [{ clusterId: cluster.id, beatIds: [spark.id, beat.id] }] })
    let b = await board()
    expect(b.beats.filter(x => x.cluster_id === cluster.id).map(x => x.title)).toEqual(['A gull with a message', 'Ambush at the docks'])

    // Played in a session → leaves the tray
    const session = Number(db.prepare('INSERT INTO sessions (campaign_id, title) VALUES (?, ?)').run(campaignId, 'Session 3').lastInsertRowid)
    const played = await story<StoryBeat>('PATCH', `beats/${beat.id}`, { played_session_id: session })
    expect(played).toMatchObject({ status: 'played', tray_order: null, played_session_id: session })

    // Saving the edit dialog as-is (same session) keeps it played; setting it back to ready un-plays it
    const resaved = await story<StoryBeat>('PATCH', `beats/${beat.id}`, { title: 'Ambush at the docks', played_session_id: session })
    expect(resaved).toMatchObject({ status: 'played', played_session_id: session })
    const restored = await story<StoryBeat>('PATCH', `beats/${beat.id}`, { status: 'ready', played_session_id: session, in_tray: true })
    expect(restored.status).toBe('ready')
    expect(restored.played_session_id).toBeNull()
    expect(restored.tray_order).not.toBeNull()
    await story('PATCH', `beats/${beat.id}`, { played_session_id: session })

    // Settings
    await story('PATCH', 'settings', { campaignId, color_by: 'region', party_location_id: harbor })
    b = await board()
    expect(b.settings).toEqual({ color_by: 'region', party_location_id: harbor, group_by: 'storyline', compact: false, acts: null, rep_consequences: true, rep_rumors: true })
    await story('PATCH', 'settings', { campaignId, acts: [' Prologue ', '', 'The Spire'] })
    expect((await board()).settings.acts).toEqual(['Prologue', 'The Spire'])
    await story('PATCH', 'settings', { campaignId, acts: [] })
    expect((await board()).settings.acts).toBeNull()
    await story('PATCH', 'settings', { campaignId, group_by: 'heat', compact: true })
    expect((await board()).settings).toMatchObject({ group_by: 'heat', compact: true, color_by: 'region' })

    // Deleting the cluster sends its beats back to the sparks shelf
    await story('DELETE', `clusters/${cluster.id}`, undefined, {})
    b = await board()
    expect(b.clusters).toHaveLength(0)
    expect(b.beats.every(x => x.cluster_id === null)).toBe(true)

    // Deleting a storyline keeps nothing broken
    await story('DELETE', `storylines/${line.id}`)
    expect((await board()).storylines.map(s => s.name)).toEqual(['Court Intrigue'])
  })

  it('new beats in a cluster start with the cluster\'s entries and its quest\'s involved ones', async () => {
    const npc = entity('NPC', 'Harbormaster')
    const ship = entity('Location', 'The Seawind')
    const rival = entity('NPC', 'Smuggler Queen')
    const quest = await quests<Quest>('POST', '', { campaignId, name: 'Missing ship', involved_ids: [rival] })
    const cluster = await story<StoryCluster>('POST', 'clusters', { campaignId, title: 'Smugglers', entity_ids: [npc, ship], quest_id: quest.id })
    expect(cluster.entities.map(e => e.name)).toEqual(['Harbormaster', 'The Seawind'])
    const quick = await story<StoryBeat>('POST', 'beats', { campaignId, title: 'Quick add', cluster_id: cluster.id })
    expect(quick.entities.map(e => e.name).sort()).toEqual(['Harbormaster', 'Smuggler Queen', 'The Seawind'])
    const explicit = await story<StoryBeat>('POST', 'beats', { campaignId, title: 'Picked by hand', cluster_id: cluster.id, entity_ids: [npc] })
    expect(explicit.entities.map(e => e.name)).toEqual(['Harbormaster'])
    const spark = await story<StoryBeat>('POST', 'beats', { campaignId, title: 'Loose' })
    expect(spark.entities).toEqual([])
  })

  it('rejects other campaigns\' entries and unknown campaigns', async () => {
    const other = Number(db.prepare('INSERT INTO campaigns (name) VALUES (?)').run('Other').lastInsertRowid)
    const foreign = Number(db.prepare('INSERT INTO entities (type_id, campaign_id, name) VALUES (?, ?, ?)').run(typeId('NPC'), other, 'Stranger').lastInsertRowid)
    const beat = await story<StoryBeat>('POST', 'beats', { campaignId, title: 'Hello', entity_ids: [foreign] })
    expect(beat.entities).toEqual([])
    await expect(story('GET', 'board', undefined, { campaignId: 999999 })).rejects.toMatchObject({ statusCode: 400 })
    await expect(story('PATCH', 'beats/999999', {})).rejects.toMatchObject({ statusCode: 404 })
  })

  it('faction agendas keep their clock in range', async () => {
    const faction = entity('Faction', 'The Tide Court')
    const agenda = await story<FactionAgenda>('POST', 'agendas', { campaignId, faction_id: faction, goal: 'Seize the harbor', clock_size: 4 })
    expect(agenda).toMatchObject({ faction_name: 'The Tide Court', clock_size: 4, clock_filled: 0, status: 'active' })
    const filled = await story<FactionAgenda>('PATCH', `agendas/${agenda.id}`, { clock_filled: 10 })
    expect(filled.clock_filled).toBe(4)
    expect(await story<FactionAgenda[]>('GET', 'agendas', undefined, { campaignId, factionId: faction })).toHaveLength(1)
    await expect(story('POST', 'agendas', { campaignId, faction_id: entity('NPC', 'Not a faction'), goal: 'x' })).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('archive', () => {
  it('archives clusters and beats (out of the tray) and restores them', async () => {
    const cluster = await story<StoryCluster>('POST', 'clusters', { campaignId, title: 'Old thread' })
    const beat = await story<StoryBeat>('POST', 'beats', { campaignId, title: 'Planned', cluster_id: cluster.id, in_tray: true })
    const spark = await story<StoryBeat>('POST', 'beats', { campaignId, title: 'Loose idea', in_tray: true })
    expect((await story<StoryCluster>('PATCH', `clusters/${cluster.id}`, { archived: true })).archived).toBe(true)
    expect((await story<StoryBeat>('PATCH', `beats/${spark.id}`, { archived: true })).archived).toBe(true)
    const b = await board()
    expect(b.beats.find(x => x.id === beat.id)!.tray_order).toBeNull()
    expect(b.beats.find(x => x.id === spark.id)).toMatchObject({ archived: true, tray_order: null })
    expect((await story<StoryCluster>('PATCH', `clusters/${cluster.id}`, { archived: false })).archived).toBe(false)
    expect((await story<StoryBeat>('PATCH', `beats/${spark.id}`, { archived: false })).archived).toBe(false)
  })
})

describe('story map', () => {
  it('places quests, clusters and beats, joins them with arrows, cleans up what is gone', async () => {
    const quest = await quests<Quest>('POST', '', { campaignId, name: 'Get our weapons back' })
    const cluster = await story<StoryCluster>('POST', 'clusters', { campaignId, title: 'The guardhouse' })
    const beat = await story<StoryBeat>('POST', 'beats', { campaignId, title: 'Bribe the guard', cluster_id: cluster.id })

    const q = await story<StoryMapNode>('POST', 'map/nodes', { campaignId, kind: 'quest', ref_id: quest.id, x: 0, y: 0 })
    const c = await story<StoryMapNode>('POST', 'map/nodes', { campaignId, kind: 'cluster', ref_id: cluster.id, x: 300, y: 0, act: 2 })
    expect(c.act).toBe(2)
    expect((await story<StoryMapNode>('PATCH', `map/nodes/${c.id}`, { act: null })).act).toBeNull()
    expect((await story<StoryMapNode>('PATCH', `map/nodes/${c.id}`, { act: 1 })).x).toBe(300)
    const b = await story<StoryMapNode>('POST', 'map/nodes', { campaignId, kind: 'beat', ref_id: beat.id, x: 600, y: 0 })
    // Adding the same thing again moves the card instead of duplicating it
    expect((await story<StoryMapNode>('POST', 'map/nodes', { campaignId, kind: 'beat', ref_id: beat.id, x: 650, y: 40 })).id).toBe(b.id)
    await expect(story('POST', 'map/nodes', { campaignId, kind: 'beat', ref_id: 99999 })).rejects.toMatchObject({ statusCode: 400 })

    const e1 = await story<StoryMapEdge>('POST', 'map/edges', { campaignId, from_node: q.id, to_node: c.id, label: ' if they go quietly ' })
    expect(e1.label).toBe('if they go quietly')
    const e2 = await story<StoryMapEdge>('POST', 'map/edges', { campaignId, from_node: c.id, to_node: b.id })
    expect(e2.kind).toBe('leads')
    expect((await story<StoryMapEdge>('PATCH', `map/edges/${e2.id}`, { kind: 'related' })).kind).toBe('related')
    await expect(story('POST', 'map/edges', { campaignId, from_node: c.id, to_node: c.id })).rejects.toMatchObject({ statusCode: 400 })
    expect((await story<StoryMapEdge>('PATCH', `map/edges/${e1.id}`, { label: '' })).label).toBeNull()

    await story('POST', 'map/positions', { campaignId, nodes: [{ id: q.id, x: 10, y: 20 }] })
    let map = await story<StoryMap>('GET', 'map', undefined, { campaignId })
    expect(map.nodes).toHaveLength(3)
    expect(map.nodes.find(n => n.id === q.id)).toMatchObject({ x: 10, y: 20 })
    expect(map.edges).toHaveLength(2)

    // Deleting the beat removes its card and its arrows; taking a card off the map keeps the quest
    await story('DELETE', `beats/${beat.id}`)
    await story('DELETE', `map/nodes/${q.id}`)
    map = await story<StoryMap>('GET', 'map', undefined, { campaignId })
    expect(map.nodes.map(n => n.kind)).toEqual(['cluster'])
    expect(map.edges).toEqual([])
    expect(await quests<Quest>('GET', String(quest.id))).toMatchObject({ name: 'Get our weapons back' })
  })
})

describe('quests API', () => {
  it('creates, edits, lists and soft-deletes quests', async () => {
    const giver = entity('NPC', 'Harbormaster')
    const q = await quests<Quest>('POST', '', { campaignId, name: 'Find the missing ship', giver_id: giver, objectives: ['Ask at the docks', 'Search the reef'] })
    expect(q).toMatchObject({ status: 'rumor', giver_name: 'Harbormaster', giver_type: 'NPC', objectives: [{ text: 'Ask at the docks', done: false }, { text: 'Search the reef', done: false }] })

    const moved = await quests<Quest>('PATCH', String(q.id), { status: 'active', objectives: [{ text: 'Ask at the docks', done: true }] })
    expect(moved.status).toBe('active')
    expect(moved.giver_name).toBe('Harbormaster') // untouched fields stay
    expect(moved.objectives).toEqual([{ text: 'Ask at the docks', done: true }])

    // Entries involved in the quest are relations, so they show up as connections both ways
    const ship = entity('Location', 'The Seawind')
    const linked = await quests<Quest>('PATCH', String(q.id), { involved_ids: [ship, giver, q.id] })
    expect(linked.involved.map(e => e.name)).toEqual(['Harbormaster', 'The Seawind'])
    expect(db.prepare('SELECT COUNT(*) AS n FROM entity_relations WHERE from_entity_id = ? AND relation_type = ?').get(q.id, 'involved')).toEqual({ n: 2 })
    expect((await quests<Quest>('PATCH', String(q.id), { reward: '50 gp' })).involved).toHaveLength(2) // untouched unless sent

    expect((await quests<Quest[]>('GET', '', undefined, { campaignId })).map(x => x.name)).toEqual(['Find the missing ship'])
    await quests('DELETE', String(q.id))
    expect(await quests<Quest[]>('GET', '', undefined, { campaignId })).toEqual([])
    await expect(quests('GET', String(q.id))).rejects.toMatchObject({ statusCode: 404 })
  })

  it('questlines: several givers, hidden giver, major/minor, optional, chain order', async () => {
    const a = entity('NPC', 'Marisol')
    const b = entity('Faction', 'Tide Court')
    const line = await story<StoryLine>('POST', 'storylines', { campaignId, name: 'Crown' })
    const chain = await story<Questline>('POST', 'questlines', { campaignId, name: 'The sigil', storyline_id: line.id, importance: 'minor', optional: true })
    expect(chain).toMatchObject({ name: 'The sigil', storyline_id: line.id, importance: 'minor', optional: true })

    const q1 = await quests<Quest>('POST', '', { campaignId, name: 'Rumor of a sigil', giver_ids: [a, b], giver_hidden: true, questline_id: chain.id, importance: 'major' })
    expect(q1).toMatchObject({ giver_id: a, giver_name: 'Marisol', giver_ids: [a, b], giver_hidden: true, importance: 'major', optional: null, questline_id: chain.id })
    expect(q1.givers.map(g => g.name)).toEqual(['Marisol', 'Tide Court'])
    // Older callers sending one giver_id put it first and keep the rest
    expect((await quests<Quest>('PATCH', String(q1.id), { giver_id: b })).giver_ids).toEqual([b, a])
    expect((await quests<Quest>('PATCH', String(q1.id), { importance: null, optional: false })).importance).toBeNull()

    const q2 = await quests<Quest>('POST', '', { campaignId, name: 'Find the forger' })
    await story('POST', 'order', { campaignId, chains: [{ questlineId: chain.id, questIds: [q2.id, q1.id] }] })
    const all = await quests<Quest[]>('GET', '', undefined, { campaignId })
    expect(all.filter(q => q.questline_id === chain.id).sort((x, y) => x.questline_order - y.questline_order).map(q => q.name)).toEqual(['Find the forger', 'Rumor of a sigil'])
    expect((await story<StoryBoard>('GET', 'board', undefined, { campaignId })).questlines).toHaveLength(1)

    // Deleting the questline keeps its quests
    await story('DELETE', `questlines/${chain.id}`)
    expect((await quests<Quest>('GET', String(q2.id))).questline_id).toBeNull()
  })
})

describe('story board export / import', () => {
  it('round-trips storylines, clusters, beats, links, agendas and quest references', async () => {
    const { exportStoryBoard, importStoryBoard } = await import('../../server/utils/storyBoardTransfer')
    const npc = entity('NPC', 'Captain Vey')
    const faction = entity('Faction', 'The Tide Court')
    const line = await story<StoryLine>('POST', 'storylines', { campaignId, name: 'Crown', color: 4 })
    const cluster = await story<StoryCluster>('POST', 'clusters', { campaignId, title: 'Smugglers', storyline_id: line.id })
    await story('POST', 'beats', { campaignId, title: 'Ambush', cluster_id: cluster.id, entity_ids: [npc], in_tray: true })
    await story('POST', 'beats', { campaignId, title: 'Loose idea' })
    await story('POST', 'agendas', { campaignId, faction_id: faction, goal: 'Seize the harbor', clock_filled: 2 })
    const chain = await story<Questline>('POST', 'questlines', { campaignId, name: 'Main chain', storyline_id: line.id, optional: true })
    const quest = await quests<Quest>('POST', '', { campaignId, name: 'Missing ship', giver_id: npc, storyline_id: line.id, questline_id: chain.id })

    const qNode = await story<StoryMapNode>('POST', 'map/nodes', { campaignId, kind: 'quest', ref_id: quest.id, x: 5, y: 6 })
    const cNode = await story<StoryMapNode>('POST', 'map/nodes', { campaignId, kind: 'cluster', ref_id: cluster.id, x: 300, y: 6 })
    await story('POST', 'map/edges', { campaignId, from_node: cNode.id, to_node: qNode.id, label: 'if they win' })
    const refs = new Map([[npc, 'entity:1'], [faction, 'entity:2'], [quest.id, 'entity:3']])
    const data = exportStoryBoard(db, campaignId, refs, new Map())!
    expect(data.beats.map(b => b.title).sort()).toEqual(['Ambush', 'Loose idea'])

    // Into a fresh campaign with new entity ids
    const target = Number(db.prepare('INSERT INTO campaigns (name) VALUES (?)').run('Copy').lastInsertRowid)
    const add = (type: string, name: string, metadata: string | null = null) => Number(db.prepare('INSERT INTO entities (type_id, campaign_id, name, metadata) VALUES (?, ?, ?, ?)').run(typeId(type), target, name, metadata).lastInsertRowid)
    const npc2 = add('NPC', 'Captain Vey')
    const faction2 = add('Faction', 'The Tide Court')
    const quest2 = add('Quest', 'Missing ship', JSON.stringify({ status: 'rumor', giver_id: npc, storyline_id: line.id }))
    importStoryBoard(db, target, data, new Map([['entity:1', npc2], ['entity:2', faction2], ['entity:3', quest2]]), new Map())

    const copy = await story<StoryBoard>('GET', 'board', undefined, { campaignId: target })
    expect(copy.storylines).toMatchObject([{ name: 'Crown', color: 4 }])
    expect(copy.clusters[0]!.storyline_id).toBe(copy.storylines[0]!.id)
    const ambush = copy.beats.find(b => b.title === 'Ambush')!
    expect(ambush.cluster_id).toBe(copy.clusters[0]!.id)
    expect(ambush.entities.map(e => e.id)).toEqual([npc2])
    expect(ambush.tray_order).toBe(0)
    expect(copy.beats.find(b => b.title === 'Loose idea')!.cluster_id).toBeNull()
    expect(await story<FactionAgenda[]>('GET', 'agendas', undefined, { campaignId: target })).toMatchObject([{ faction_id: faction2, clock_filled: 2 }])
    const copyMap = await story<StoryMap>('GET', 'map', undefined, { campaignId: target })
    expect(copyMap.nodes.map(n => [n.kind, n.ref_id])).toEqual([['quest', quest2], ['cluster', copy.clusters[0]!.id]])
    expect(copyMap.edges).toMatchObject([{ label: 'if they win' }])
    expect(copy.questlines).toMatchObject([{ name: 'Main chain', optional: true, storyline_id: copy.storylines[0]!.id }])
    expect(await quests<Quest>('GET', String(quest2))).toMatchObject({ giver_id: npc2, giver_ids: [npc2], storyline_id: copy.storylines[0]!.id, questline_id: copy.questlines[0]!.id })
  })
})
