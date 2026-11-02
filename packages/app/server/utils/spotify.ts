import { createHash, randomBytes } from 'node:crypto'
import type Database from 'better-sqlite3'
import { readJsonSetting, readSetting, writeSetting } from './settings'
import { SPOTIFY_SCOPES, type SpotifyItem } from '../../types/spotify'

// Spotify Web API with PKCE: the DM's own developer app (Client ID only, no secret),
// tokens kept in the encrypted settings table, refreshed when they run out.

const ACCOUNTS = 'https://accounts.spotify.com'
const API = 'https://api.spotify.com/v1'
const KEY_CLIENT = 'spotify_client_id'
const KEY_TOKENS = 'spotify_tokens'

interface Tokens { access_token: string, refresh_token: string, expires_at: number, user?: string | null }

export class SpotifyError extends Error {
  constructor(public status: number, message: string, public reason?: string) {
    super(message)
  }
}

export function clientId(db: Database.Database): string | null {
  return readSetting(db, KEY_CLIENT)?.trim() || null
}
export function setClientId(db: Database.Database, id: string | null) {
  if (id && id.trim()) writeSetting(db, KEY_CLIENT, id.trim())
  else db.prepare('DELETE FROM settings WHERE key = ?').run(KEY_CLIENT)
}
export function tokens(db: Database.Database): Tokens | null {
  return readJsonSetting<Tokens | null>(db, KEY_TOKENS, null)
}
function saveTokens(db: Database.Database, t: Tokens) {
  writeSetting(db, KEY_TOKENS, JSON.stringify(t))
}
export function disconnect(db: Database.Database) {
  db.prepare('DELETE FROM settings WHERE key = ?').run(KEY_TOKENS)
}

/** Spotify only accepts loopback by IP, never "localhost" */
export function redirectUri(port: string | number): string {
  return `http://127.0.0.1:${port}/api/spotify/callback`
}

// state → verifier while the DM is on Spotify's login page
const pending = new Map<string, { verifier: string, redirect: string, at: number }>()

export function authorizeUrl(db: Database.Database, redirect: string): string {
  const id = clientId(db)
  if (!id) throw new SpotifyError(400, 'No Spotify Client ID saved')
  const verifier = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const state = randomBytes(16).toString('hex')
  for (const [k, v] of pending) if (Date.now() - v.at > 15 * 60_000) pending.delete(k)
  pending.set(state, { verifier, redirect, at: Date.now() })
  const q = new URLSearchParams({
    client_id: id,
    response_type: 'code',
    redirect_uri: redirect,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES.join(' '),
    state,
  })
  return `${ACCOUNTS}/authorize?${q}`
}

async function tokenRequest(body: Record<string, string>): Promise<{ access_token: string, refresh_token?: string, expires_in: number }> {
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  if (!res.ok) throw new SpotifyError(res.status, `Spotify login failed (${res.status}): ${await res.text()}`)
  return await res.json() as { access_token: string, refresh_token?: string, expires_in: number }
}

export async function finishLogin(db: Database.Database, code: string, state: string) {
  const p = pending.get(state)
  if (!p) throw new SpotifyError(400, 'This login link expired — start again from DM Hero')
  pending.delete(state)
  const t = await tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: p.redirect,
    client_id: clientId(db) ?? '',
    code_verifier: p.verifier,
  })
  const saved: Tokens = { access_token: t.access_token, refresh_token: t.refresh_token ?? '', expires_at: Date.now() + t.expires_in * 1000 }
  saveTokens(db, saved)
  const me = await api<{ display_name: string | null, id: string }>(db, 'GET', '/me').catch(() => null)
  saveTokens(db, { ...saved, user: me?.display_name || me?.id || null })
}

async function accessToken(db: Database.Database): Promise<string> {
  const t = tokens(db)
  if (!t) throw new SpotifyError(401, 'Spotify is not connected')
  if (Date.now() < t.expires_at - 60_000) return t.access_token
  const r = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: clientId(db) ?? '' })
  const next = { ...t, access_token: r.access_token, refresh_token: r.refresh_token ?? t.refresh_token, expires_at: Date.now() + r.expires_in * 1000 }
  saveTokens(db, next)
  return next.access_token
}

/** One Web API call; empty answers (204) come back as null */
export async function api<T>(db: Database.Database, method: string, path: string, body?: unknown): Promise<T | null> {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken(db)}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204 || res.status === 202) return null
  const text = await res.text()
  if (!res.ok) {
    let reason: string | undefined
    let message = text
    try {
      const j = JSON.parse(text) as { error?: { message?: string, reason?: string } }
      reason = j.error?.reason
      message = j.error?.message ?? text
    }
    catch {
      // plain text error
    }
    throw new SpotifyError(res.status, message, reason)
  }
  return text ? JSON.parse(text) as T : null
}

interface Image { url: string }
interface RawItem { uri: string, name: string, type: string, images?: Image[], album?: { images?: Image[] }, owner?: { display_name?: string }, artists?: { name: string }[], tracks?: { total?: number } }

/** Playlists, albums, tracks and artists in one shape */
export function toItem(r: RawItem | null | undefined): SpotifyItem | null {
  if (!r?.uri) return null
  const image = r.images?.[r.images.length > 1 ? 1 : 0]?.url ?? r.album?.images?.[r.album.images.length > 1 ? 1 : 0]?.url ?? null
  const subtitle = r.type === 'playlist' ? r.owner?.display_name ?? null : r.artists?.map(a => a.name).join(', ') ?? null
  return { uri: r.uri, name: r.name, kind: r.type, subtitle, image }
}
