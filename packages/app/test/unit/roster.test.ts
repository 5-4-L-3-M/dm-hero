import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { getTestDb } from '../utils/test-db'
import type { Roster, RosterBook, RosterPlace, RosterRole } from '../../types/roster'

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

  it('takes factions too, and place headings follow the shared place categories', async () => {
    const places = async <T>(method: string, path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> => {
      const handler = (await import('../../server/api/places/[...path]')).default as unknown as (e: FakeEvent) => Promise<T>
      return await handler({ method, context: { params: { path } }, body, query })
    }
    const city = entity('Location', 'Vaelrun City', null, { type: 'city' })
    const inn = entity('Location', 'The Gatehouse Inn', city, { type: 'inn' })
    const thieves = entity('Faction', 'Thieves Guild')
    await roster('POST', 'places', { campaignId, location_id: thieves, category: 'Guilds & Factions' })
    await roster('POST', 'roles', { campaignId, location_id: thieves, role: 'Guildmaster' })
    await roster('POST', 'roles', { campaignId, location_id: inn, role: 'Barkeep' })

    const pc = await places<{ categories: Array<{ id: number, name: string }>, locations: Array<{ id: number, category_id: number | null, explicit: boolean }> }>('GET', '', undefined, { campaignId })
    const named = (n: string) => pc.categories.find(c => c.name === n)!.id
    expect(pc.locations.find(l => l.id === inn)).toMatchObject({ category_id: named('Inns & Taverns'), explicit: false })
    expect(pc.locations.find(l => l.id === city)!.category_id).toBe(named('Settlements'))

    let all = await roster<Roster>('GET', '', undefined, { campaignId })
    expect(all.places.map(p => [p.name, p.kind, p.category])).toEqual([['Thieves Guild', 'Faction', 'Guilds & Factions'], ['The Gatehouse Inn', 'Location', 'Inns & Taverns']])

    // Moving the inn to a new heading creates that category and files the place there (maps follow)
    await roster('PATCH', `places/${inn}`, { category: 'Haunts' })
    all = await roster<Roster>('GET', '', undefined, { campaignId })
    expect(all.places.find(p => p.location_id === inn)!.category).toBe('Haunts')
    const after = await places<{ categories: Array<{ id: number, name: string, color: string }>, locations: Array<{ id: number, category_id: number | null, explicit: boolean }> }>('GET', '', undefined, { campaignId })
    const haunts = after.categories.find(c => c.name === 'Haunts')!
    expect(after.locations.find(l => l.id === inn)).toMatchObject({ category_id: haunts.id, explicit: true })

    // Recolour, then delete the category: the inn falls back to its guess
    expect((await places<{ color: string }>('PATCH', `categories/${haunts.id}`, { color: '#112233' })).color).toBe('#112233')
    await places('DELETE', `categories/${haunts.id}`)
    const back = await places<{ locations: Array<{ id: number, category_id: number | null, explicit: boolean }> }>('GET', '', undefined, { campaignId })
    expect(back.locations.find(l => l.id === inn)).toMatchObject({ category_id: named('Inns & Taverns'), explicit: false })
    expect((await places<{ category_id: number }>('PUT', 'location', { campaignId, location_id: inn, category_id: named('Settlements') })).category_id).toBe(named('Settlements'))
  })

  it('keeps separate named rosters, one per city', async () => {
    const vaelrun = entity('Location', 'Vaelrun City', null, { type: 'city' })
    const inn = entity('Location', 'The Gatehouse Inn', vaelrun, { type: 'inn' })
    const port = entity('Location', 'Saltmere', null, { type: 'city' })
    const docks = entity('Location', 'The Docks', port, { type: 'district' })

    // A first roster exists from the start; places land there by default
    await roster('POST', 'roles', { campaignId, location_id: inn, role: 'Barkeep' })
    let all = await roster<Roster>('GET', '', undefined, { campaignId })
    expect(all.books.map(b => b.name)).toEqual(['Main roster'])
    const main = all.books[0]!
    expect(all.places[0]!.book_id).toBe(main.id)

    await roster('PATCH', `books/${main.id}`, { name: 'Vaelrun City' })
    const salt = await roster<RosterBook>('POST', 'books', { campaignId, name: ' Saltmere ' })
    expect(salt.name).toBe('Saltmere')
    await expect(roster('POST', 'books', { campaignId, name: '  ' })).rejects.toMatchObject({ statusCode: 400 })

    // Add straight into the second roster; adding a role later keeps it there
    expect((await roster<RosterPlace>('POST', 'places', { campaignId, location_id: docks, book_id: salt.id })).book_id).toBe(salt.id)
    await roster('POST', 'roles', { campaignId, location_id: docks, role: 'Harbourmaster' })
    all = await roster<Roster>('GET', '', undefined, { campaignId })
    expect(all.books.map(b => b.name)).toEqual(['Vaelrun City', 'Saltmere'])
    expect(all.places.find(p => p.location_id === docks)!.book_id).toBe(salt.id)

    // Move a place across, then delete a roster: its places move to the other one
    expect((await roster<RosterPlace>('PATCH', `places/${inn}`, { book_id: salt.id })).book_id).toBe(salt.id)
    expect((await roster<{ moved_to: number }>('DELETE', `books/${salt.id}`)).moved_to).toBe(main.id)
    all = await roster<Roster>('GET', '', undefined, { campaignId })
    expect(all.books).toHaveLength(1)
    expect(all.places.every(p => p.book_id === main.id)).toBe(true)
    expect(all.roles).toHaveLength(2)
    await expect(roster('DELETE', `books/${main.id}`)).rejects.toMatchObject({ statusCode: 400 })
  })
})
