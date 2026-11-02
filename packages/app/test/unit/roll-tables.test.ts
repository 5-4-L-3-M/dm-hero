import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { getTestDb } from '../utils/test-db'
import { parseRows, rollDice, rowFor, tableDice, type RollTable } from '../../types/rollTable'

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
async function call<T>(method: string, path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
  const mod = await import('../../server/api/roll-tables/[...path]')
  const { matchSubRoute } = await import('../../server/utils/subRouter')
  const m = matchSubRoute(mod.rollTableRoutes, method, path)!
  return await (m.handler as unknown as (e: FakeEvent) => Promise<T>)({ method, context: { params: m.params }, body, query })
}
beforeEach(() => {
  db = getTestDb()
  campaignId = Number(db.prepare('INSERT INTO campaigns (name) VALUES (?)').run('Aevum').lastInsertRowid)
})

describe('roll tables', () => {
  it('reads pasted tables in the usual shapes', () => {
    expect(parseRows('1-4 | A cutpurse\n5–6: City watch\n7 Rain')).toEqual([
      { min: 1, max: 4, result: 'A cutpurse' }, { min: 5, max: 6, result: 'City watch' }, { min: 7, max: 7, result: 'Rain' },
    ])
    expect(parseRows('| d6 | Result |\n|---|---|\n| 1–2 | Rats |\n| 3–6 | Nothing |')).toEqual([{ min: 1, max: 2, result: 'Rats' }, { min: 3, max: 6, result: 'Nothing' }])
    expect(parseRows('Fog\nA song\nBells')).toEqual([{ min: 1, max: 1, result: 'Fog' }, { min: 2, max: 2, result: 'A song' }, { min: 3, max: 3, result: 'Bells' }])
    expect(tableDice({ dice: null, rows: [{ min: 1, max: 4, result: 'x' }, { min: 5, max: 12, result: 'y' }] })).toBe('d12')
    expect(rollDice('2d6', () => 0.99)).toEqual({ total: 12, rolls: [6, 6] })
    expect(rowFor([{ min: 1, max: 4, result: 'a' }, { min: 5, max: 6, result: 'b' }], 5)?.result).toBe('b')
  })

  it('saves tables with rows and tags, and lists them per tag', async () => {
    const typeId = (name: string) => (db.prepare('SELECT id FROM entity_types WHERE name = ?').get(name) as { id: number }).id
    const docks = Number(db.prepare('INSERT INTO entities (type_id, campaign_id, name) VALUES (?, ?, ?)').run(typeId('Location'), campaignId, 'The Docks').lastInsertRowid)
    const session = Number(db.prepare('INSERT INTO sessions (campaign_id, session_number, title) VALUES (?, ?, ?)').run(campaignId, 3, 'The Honesty House').lastInsertRowid)
    const t = await call<RollTable>('POST', '', { campaignId, name: 'Dock rumors', category: 'Rumors', rows: parseRows('1-3 Smugglers\n4-6 Ghost ship'), tags: [{ kind: 'entity', ref_id: docks }, { kind: 'session', ref_id: session }] })
    expect(t.rows).toHaveLength(2)
    expect(t.tags.map(x => x.name).sort()).toEqual(['#3 The Honesty House', 'The Docks'])
    await call('POST', '', { campaignId, name: 'Weather', rows: [] })
    expect((await call<RollTable[]>('GET', '', undefined, { campaignId })).map(x => x.name)).toEqual(['Dock rumors', 'Weather'])
    expect((await call<RollTable[]>('GET', '', undefined, { campaignId, entityId: docks })).map(x => x.name)).toEqual(['Dock rumors'])
    expect((await call<RollTable[]>('GET', '', undefined, { campaignId, sessionId: session })).map(x => x.name)).toEqual(['Dock rumors'])
    const edited = await call<RollTable>('PATCH', String(t.id), { name: 'Dock whispers', tags: [] })
    expect(edited).toMatchObject({ name: 'Dock whispers', tags: [] })
    await call('DELETE', String(t.id))
    expect(await call<RollTable[]>('GET', '', undefined, { campaignId, entityId: docks })).toEqual([])
  })
})
