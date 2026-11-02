import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { getTestDb } from '../utils/test-db'
import type { Roster, RosterPlace, RosterRole } from '../../types/roster'

// NPC roster: places under category headings, roles filled by NPCs or open
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
async function roster<T>(method: string, path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
  const handler = (await import('../../server/api/roster/[...path]')).default as unknown as (e: FakeEvent) => Promise<T>
  return await handler({ method, context: { params: { path } }, body, query })
}

beforeEach(() => {
  db = getTestDb()
  campaignId = Number(db.prepare('INSERT INTO campaigns (name) VALUES (?)').run('Aevum').lastInsertRowid)
})

describe('NPC roster', () => {
  it('keeps places under categories with filled and open roles, and finds the settlement', async () => {
    const city = entity('Location', 'Vaelrun City', null, { type: 'city' })
    const row = entity('Location', 'Fennel Row', city, { type: 'district' })
    const shop = entity('Location', 'Caput Mortuum', row, { type: 'shop' })
    const fitch = entity('NPC', 'Veruico Fitch', null, { race: 'gnome', age: 200, age_human: '47', loyalty: 'dissident' })

    const place = await roster<RosterPlace>('POST', 'places', { campaignId, location_id: shop, category: 'Shops & Services' })
    expect(place).toMatchObject({ name: 'Caput Mortuum', type: 'shop', category: 'Shops & Services', settlement_name: 'Vaelrun City' })

    const owner = await roster<RosterRole>('POST', 'roles', { campaignId, location_id: shop, role: 'Owner/Shopkeeper', npc_id: fitch, note: ' Runs the shop, brews everything ' })
    expect(owner).toMatchObject({ role: 'Owner/Shopkeeper', note: 'Runs the shop, brews everything', npc: { name: 'Veruico Fitch', race: 'gnome', age: 200, age_human: '47', loyalty: 'dissident' } })
    const open = await roster<RosterRole>('POST', 'roles', { campaignId, location_id: shop, role: 'Apprentice' })
    expect(open.npc).toBeNull()

    // Adding a role to a place not on the roster yet puts the place on it
    const tavern = entity('Location', 'The Stumbling Statue', city, { type: 'tavern' })
    await roster('POST', 'roles', { campaignId, location_id: tavern, role: 'Barkeep' })

    await roster('POST', 'order', { campaignId, location_id: shop, role_ids: [open.id, owner.id] })
    let all = await roster<Roster>('GET', '', undefined, { campaignId })
    expect(all.places.map(p => p.name)).toEqual(['Caput Mortuum', 'The Stumbling Statue'])
    expect(all.roles.filter(r => r.location_id === shop).map(r => r.role)).toEqual(['Apprentice', 'Owner/Shopkeeper'])

    // Side panels: an NPC's roles, a place's roles
    expect((await roster<Roster>('GET', '', undefined, { campaignId, npcId: fitch })).roles.map(r => r.location_name)).toEqual(['Caput Mortuum'])
    expect((await roster<Roster>('GET', '', undefined, { campaignId, locationId: tavern })).roles).toHaveLength(1)

    // Fill the open role, clear the note; a deleted NPC leaves the role open again
    const thad = entity('NPC', 'Thaddeus Northmere')
    expect((await roster<RosterRole>('PATCH', `roles/${open.id}`, { npc_id: thad })).npc?.name).toBe('Thaddeus Northmere')
    expect((await roster<RosterRole>('PATCH', `roles/${owner.id}`, { note: '' })).note).toBeNull()
    db.prepare('UPDATE entities SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(thad)
    all = await roster<Roster>('GET', '', undefined, { campaignId })
    expect(all.roles.find(r => r.id === open.id)!.npc).toBeNull()

    await expect(roster('POST', 'roles', { campaignId, location_id: fitch, role: 'Owner' })).rejects.toMatchObject({ statusCode: 400 })

    // Taking the place off the roster removes its roles, not the NPCs
    await roster('DELETE', `places/${shop}`)
    all = await roster<Roster>('GET', '', undefined, { campaignId })
    expect(all.places.map(p => p.name)).toEqual(['The Stumbling Statue'])
    expect(all.roles.every(r => r.location_id === tavern)).toBe(true)
  })
})
