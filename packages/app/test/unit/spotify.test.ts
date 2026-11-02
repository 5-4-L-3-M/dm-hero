import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { getTestDb } from '../utils/test-db'
import type { SpotifyScene } from '../../types/spotify'

// Spotify remote: PKCE login link from the DM's own Client ID, campaign scene buttons
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
  g.getRequestURL = () => new URL('http://127.0.0.1:3456/api/spotify/x')
  g.createError = (o: { statusCode: number, message: string }) => Object.assign(new Error(o.message), { statusCode: o.statusCode })
})

let campaignId: number
async function call<T>(method: string, path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
  const mod = await import('../../server/api/spotify/[...path]')
  const { matchSubRoute } = await import('../../server/utils/subRouter')
  const m = matchSubRoute(mod.spotifyRoutes, method, path)!
  return await (m.handler as unknown as (e: FakeEvent) => Promise<T>)({ method, context: { params: m.params }, body, query })
}

beforeEach(() => {
  db = getTestDb()
  campaignId = Number(db.prepare('INSERT INTO campaigns (name) VALUES (?)').run('Aevum').lastInsertRowid)
})

describe('spotify', () => {
  it('builds the PKCE login link from the saved Client ID', async () => {
    expect(await call('GET', 'status')).toMatchObject({ configured: false, connected: false, redirectUri: 'http://127.0.0.1:3456/api/spotify/callback' })
    await call('POST', 'config', { clientId: ' abc123 ' })
    expect(await call('GET', 'status')).toMatchObject({ configured: true, connected: false })
    const { url } = await call<{ url: string }>('GET', 'login')
    const u = new URL(url)
    expect(u.origin + u.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(u.searchParams.get('client_id')).toBe('abc123')
    expect(u.searchParams.get('code_challenge_method')).toBe('S256')
    expect(u.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:3456/api/spotify/callback')
    expect(u.searchParams.get('scope')).toContain('user-modify-playback-state')
  })

  it('keeps scene buttons per campaign, in order', async () => {
    await call('POST', 'scenes', { campaignId, name: 'Tavern', uri: 'spotify:playlist:1' })
    let scenes = await call<SpotifyScene[]>('POST', 'scenes', { campaignId, name: 'Combat', uri: 'spotify:playlist:2' })
    expect(scenes.map(s => s.name)).toEqual(['Tavern', 'Combat'])
    scenes = await call<SpotifyScene[]>('POST', 'scenes/order', { campaignId, ids: [scenes[1]!.id, scenes[0]!.id] })
    expect(scenes.map(s => s.name)).toEqual(['Combat', 'Tavern'])
    scenes = await call<SpotifyScene[]>('PATCH', `scenes/${scenes[0]!.id}`, { name: 'Boss fight' })
    expect(scenes[0]!.name).toBe('Boss fight')
    scenes = await call<SpotifyScene[]>('DELETE', `scenes/${scenes[1]!.id}`)
    expect(scenes.map(s => s.name)).toEqual(['Boss fight'])
    await expect(call('POST', 'scenes', { campaignId, name: 'x', uri: 'https://example.com' })).rejects.toThrow()
  })
})
