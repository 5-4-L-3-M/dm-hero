import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { getTestDb } from '../utils/test-db'
import { DEFAULT_LAYOUTS, cleanLayout, type DashboardCard } from '../../types/dashboard'

// Customisable dashboards: defaults until saved, saved per board, reset back
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
async function dash<T>(method: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
  const handler = (await import('../../server/api/dashboard/[...path]')).default as unknown as (e: FakeEvent) => Promise<T>
  return await handler({ method, context: { params: { path: '' } }, body, query })
}

beforeEach(() => {
  db = getTestDb()
  campaignId = Number(db.prepare('INSERT INTO campaigns (name) VALUES (?)').run('Aevum').lastInsertRowid)
})

describe('dashboards', () => {
  it('starts on the default, saves each board on its own, and resets', async () => {
    expect(await dash<DashboardCard[]>('GET', undefined, { campaignId, board: 'table' })).toEqual(DEFAULT_LAYOUTS.table)

    const mine: DashboardCard[] = [{ i: 'pad', type: 'scratchpad', x: 0, y: 0, w: 6, h: 3, config: { text: 'Wren owes 5gp' } }]
    await dash('PUT', { campaignId, board: 'table', layout: mine })
    expect(await dash<DashboardCard[]>('GET', undefined, { campaignId, board: 'table' })).toEqual(mine)
    expect(await dash<DashboardCard[]>('GET', undefined, { campaignId, board: 'prep' })).toEqual(DEFAULT_LAYOUTS.prep)

    expect(await dash<DashboardCard[]>('DELETE', undefined, { campaignId, board: 'table' })).toEqual(DEFAULT_LAYOUTS.table)
    expect(await dash<DashboardCard[]>('GET', undefined, { campaignId, board: 'table' })).toEqual(DEFAULT_LAYOUTS.table)
  })

  it('drops unknown cards and keeps sizes on the grid', () => {
    expect(cleanLayout([
      { i: 'a', type: 'party', x: 20, y: -3, w: 40, h: 0 },
      { i: 'a', type: 'party', x: 0, y: 0, w: 4, h: 4 },
      { i: 'b', type: 'nope', x: 0, y: 0, w: 4, h: 4 },
    ])).toEqual([{ i: 'a', type: 'party', x: 11, y: 0, w: 12, h: 1 }])
    expect(cleanLayout('junk')).toEqual([])
  })
})
