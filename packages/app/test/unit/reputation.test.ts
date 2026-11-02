import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { getTestDb } from '../utils/test-db'
import type { RepEvent, RepRipple, Reputation } from '../../types/reputation'

// Reputation: logged changes, hidden points, tiers, ripples, world reactions
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
function entity(type: string, name: string, parent: number | null = null, metadata: object | null = null): number {
  return Number(db.prepare('INSERT INTO entities (type_id, campaign_id, name, parent_entity_id, metadata) VALUES (?, ?, ?, ?, ?)')
    .run(typeId(type), campaignId, name, parent, metadata ? JSON.stringify(metadata) : null).lastInsertRowid)
}
async function rep<T>(method: string, path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
  const handler = (await import('../../server/api/reputation/[...path]')).default as unknown as (e: FakeEvent) => Promise<T>
  return await handler({ method, context: { params: { path } }, body, query })
}

function relate(a: number, b: number, type: string) {
  db.prepare('INSERT INTO entity_relations (from_entity_id, to_entity_id, relation_type) VALUES (?, ?, ?)').run(a, b, type)
}
const sparks = () => (db.prepare('SELECT title FROM story_beats WHERE campaign_id = ? AND cluster_id IS NULL ORDER BY id').all(campaignId) as { title: string }[]).map(s => s.title)

beforeEach(() => {
  db = getTestDb()
  campaignId = Number(db.prepare('INSERT INTO campaigns (name) VALUES (?)').run('Aevum').lastInsertRowid)
})

describe('reputation', () => {
  it('logs changes, ripples to faction and city, reacts to tiers, marks NPCs met', async () => {
    const city = entity('Location', 'Vaelrun City', null, { type: 'city' })
    const shop = entity('Location', 'Foxglove & Fennel', city, { type: 'shop' })
    const shopkeeps = entity('Faction', 'Shopkeeps')
    const guard = entity('Faction', 'Hold Guard')
    const sages = entity('Faction', 'The Sages')
    const rosalind = Number(db.prepare('INSERT INTO entities (type_id, campaign_id, name, location_id) VALUES (?, ?, ?, ?)').run(typeId('NPC'), campaignId, 'Rosalind Foxglove', shop).lastInsertRowid)
    const torvin = entity('Player', 'Torvin')
    relate(rosalind, shopkeeps, 'member')
    relate(shopkeeps, guard, 'allied')
    relate(shopkeeps, sages, 'rival')

    const ripples = await rep<RepRipple[]>('GET', 'ripples', undefined, { campaignId, subjectId: rosalind, delta: 5 })
    expect(ripples.map(r => [r.subject_name, r.delta, r.why])).toEqual([['Shopkeeps', 3, 'faction'], ['Vaelrun City', 2, 'settlement']])
    const allies = await rep<RepRipple[]>('GET', 'ripples', undefined, { campaignId, subjectId: shopkeeps, delta: 4 })
    expect(allies.map(r => [r.subject_name, r.delta])).toEqual([['Hold Guard', 2], ['The Sages', -2]])

    // +5 then +5: Rosalind goes Indifferent → Friendly → Allied, with a spark each time and a rumor
    const first = await rep<{ id: number, reactions: string[] }>('POST', 'events', { campaignId, subject_id: rosalind, delta: 5, preset: 'big', reason: 'Saved Wisp from the cart', ripples })
    expect(first.reactions).toContain('Rosalind Foxglove warms to the party')
    expect(first.reactions.some(r => r.startsWith('Rumor in Vaelrun City: Saved Wisp'))).toBe(true)
    await rep('POST', 'events', { campaignId, subject_id: rosalind, delta: 5, reason: 'Kept her secret' })

    let all = await rep<Reputation>('GET', '', undefined, { campaignId })
    const track = (id: number, player = 0) => all.tracks.find(t => t.subject_id === id && t.player_id === player && t.kind === 'rep')!
    expect(track(rosalind)).toMatchObject({ points: 10, tier: 'allied', subject_type: 'NPC' })
    expect(track(shopkeeps)).toMatchObject({ points: 3, tier: 'neutral' })
    expect(track(city).points).toBe(2)
    expect(all.met.map(m => m.name)).toEqual(['Rosalind Foxglove'])
    expect(sparks()).toContain('Rosalind Foxglove would take a real risk for the party')

    // A player-only change goes on their own sub-tracker
    await rep('POST', 'events', { campaignId, subject_id: rosalind, player_id: torvin, delta: -3, reason: 'Knocked over her shelves' })
    all = await rep<Reputation>('GET', '', undefined, { campaignId })
    expect(track(rosalind, torvin)).toMatchObject({ points: -3, tier: 'unfriendly', player_name: 'Torvin' })
    expect(track(rosalind).points).toBe(10)

    // Deleting the first change takes its ripples with it
    await rep('DELETE', `events/${first.id}`)
    all = await rep<Reputation>('GET', '', undefined, { campaignId })
    expect(track(rosalind).points).toBe(5)
    expect(all.tracks.find(t => t.subject_id === shopkeeps)).toBeUndefined()
    const log = await rep<RepEvent[]>('GET', 'events', undefined, { campaignId, subjectId: rosalind })
    expect(log.map(e => e.delta)).toEqual([-3, 5])

    // Split off a player with nothing logged yet, then remove it
    await rep('POST', 'tracks', { campaignId, subject_id: guard, player_id: torvin })
    expect((await rep<Reputation>('GET', '', undefined, { campaignId, subjectId: guard })).tracks).toMatchObject([{ player_id: torvin, points: 0 }])
    await rep('DELETE', 'tracks', undefined, { campaignId, subjectId: guard, playerId: torvin })
    expect((await rep<Reputation>('GET', '', undefined, { campaignId, subjectId: guard })).tracks).toEqual([])
  })

  it('notoriety rises with crimes and cools down when the world advances; faction plans tick', async () => {
    const city = entity('Location', 'Vaelrun City', null, { type: 'city' })
    const guard = entity('Faction', 'Hold Guard')
    db.prepare("INSERT INTO faction_agendas (campaign_id, faction_id, goal, next_step, clock_size, clock_filled, status) VALUES (?, ?, 'Seize the docks', 'Bribe the harbormaster', 4, 3, 'active')").run(campaignId, guard)
    db.prepare("INSERT INTO faction_agendas (campaign_id, faction_id, goal, clock_size, clock_filled, status) VALUES (?, ?, 'Recruit more guards', 6, 0, 'active')").run(campaignId, guard)

    const crime = await rep<{ reactions: string[] }>('POST', 'events', { campaignId, subject_id: city, kind: 'notoriety', delta: 3, reason: 'Broke into the guardhouse' })
    expect(crime.reactions).toContain('The guard in Vaelrun City starts asking about the party')

    const { advanceWorld } = await import('../../server/utils/reputation')
    const turn = advanceWorld(db, campaignId, () => 0.9) // every plan ticks
    expect(turn.agendas.map(a => [a.goal, a.filled, a.done])).toEqual([['Seize the docks', 4, true], ['Recruit more guards', 1, false]])
    expect(turn.cooled).toEqual([{ place: 'Vaelrun City', notoriety: 2 }])
    expect(sparks()).toContain("Hold Guard's plan comes to a head: Seize the docks")
    expect(sparks()).toContain('Rumor: Hold Guard is up to something')
    expect(advanceWorld(db, campaignId, () => 0.1).agendas).toEqual([]) // nothing ticks on a low roll
  })

  it('shops change prices with how the place (or its city) feels about the party', async () => {
    const { priceAdjustment } = await import('../../server/utils/reputation')
    const city = entity('Location', 'Vaelrun City', null, { type: 'city' })
    const shop = entity('Location', 'Nonesuch', city, { type: 'shop' })
    expect(priceAdjustment(db, campaignId, shop).pct).toBe(0)
    await rep('POST', 'events', { campaignId, subject_id: city, delta: 10, reason: 'Saved the festival' })
    expect(priceAdjustment(db, campaignId, shop)).toMatchObject({ pct: -10, tier: 'liked', from: 'Vaelrun City' })
    await rep('POST', 'events', { campaignId, subject_id: shop, delta: -10, reason: 'Stole a curio' })
    expect(priceAdjustment(db, campaignId, shop)).toMatchObject({ pct: 20, tier: 'disliked', from: 'Nonesuch' })
  })
})
