import type { H3Event } from 'h3'
import { getDb } from '../utils/db'
import { requireCampaign } from '../utils/storyBoard'
import { SpotifyError, api, authorizeUrl, clientId, disconnect, finishLogin, redirectUri, setClientId, toItem, tokens } from '../utils/spotify'
import type { SpotifyDevice, SpotifyItem, SpotifyPlayback, SpotifyScene, SpotifyStatus } from '../../types/spotify'

/** Turn Spotify's errors into something the DM can act on */
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  }
  catch (e) {
    if (e instanceof SpotifyError) {
      const message = e.reason === 'NO_ACTIVE_DEVICE'
        ? 'Spotify isn\'t open anywhere — open the Spotify app on your computer (or phone) and try again.'
        : e.reason === 'PREMIUM_REQUIRED' ? 'Spotify only allows remote control with Premium.' : e.message
      throw createError({ statusCode: e.status === 401 ? 401 : e.status === 404 ? 409 : e.status, message, data: { reason: e.reason } })
    }
    throw e
  }
}

const port = (event: H3Event) => getRequestURL(event).port || '3456'

export const status = defineEventHandler((event): SpotifyStatus => {
  const db = getDb()
  const t = tokens(db)
  return { configured: !!clientId(db), connected: !!t, user: t?.user ?? null, redirectUri: redirectUri(port(event)) }
})

export const saveConfig = defineEventHandler(async (event) => {
  const body = await readBody<{ clientId?: string | null }>(event)
  const db = getDb()
  const before = clientId(db)
  setClientId(db, body?.clientId ?? null)
  if (before !== clientId(db)) disconnect(db)
  return { ok: true }
})

/** Spotify's login page (the app opens it in the system browser); it sends you back to /callback */
export const login = defineEventHandler(event => guard(async () => ({ url: authorizeUrl(getDb(), redirectUri(port(event))) })))

export const callback = defineEventHandler(async (event) => {
  const q = getQuery(event)
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  const page = (title: string, text: string) => `<!doctype html><meta charset="utf-8"><title>DM Hero</title>
<body style="font-family:system-ui;background:#1d1b26;color:#eee;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h1 style="font-weight:600">${title}</h1><p style="opacity:.75">${text}</p></div></body>`
  if (q.error) return page('Spotify wasn\'t connected', `Spotify said: ${String(q.error)}. Close this tab and try again from DM Hero.`)
  try {
    await finishLogin(getDb(), String(q.code ?? ''), String(q.state ?? ''))
    return page('Spotify is connected', 'You can close this tab and go back to DM Hero.')
  }
  catch (e) {
    return page('Spotify wasn\'t connected', e instanceof Error ? e.message : 'Something went wrong.')
  }
})

export const logout = defineEventHandler(() => {
  disconnect(getDb())
  return { ok: true }
})

interface RawPlayback {
  is_playing: boolean
  progress_ms: number | null
  shuffle_state: boolean
  device?: { name: string, volume_percent: number | null }
  context?: { uri: string } | null
  item?: { name: string, duration_ms: number, artists?: { name: string }[], album?: { images?: { url: string }[] }, show?: { name: string, images?: { url: string }[] } } | null
}
export const player = defineEventHandler(() => guard(async (): Promise<SpotifyPlayback> => {
  const p = await api<RawPlayback>(getDb(), 'GET', '/me/player')
  const imgs = p?.item?.album?.images ?? p?.item?.show?.images ?? []
  return {
    active: !!p,
    playing: !!p?.is_playing,
    track: p?.item?.name ?? null,
    artist: p?.item?.artists?.map(a => a.name).join(', ') ?? p?.item?.show?.name ?? null,
    image: imgs[imgs.length > 1 ? 1 : 0]?.url ?? null,
    device: p?.device?.name ?? null,
    volume: p?.device?.volume_percent ?? null,
    shuffle: !!p?.shuffle_state,
    context: p?.context?.uri ?? null,
    progressMs: p?.progress_ms ?? 0,
    durationMs: p?.item?.duration_ms ?? 0,
  }
}))

export const devices = defineEventHandler(() => guard(async (): Promise<SpotifyDevice[]> => {
  const r = await api<{ devices: Array<{ id: string, name: string, type: string, is_active: boolean, volume_percent: number | null }> }>(getDb(), 'GET', '/me/player/devices')
  return (r?.devices ?? []).map(d => ({ id: d.id, name: d.name, type: d.type, active: d.is_active, volume: d.volume_percent }))
}))

/** Play a playlist / album / artist / track (or just resume). Wakes a device if none is active. */
export const play = defineEventHandler(async (event) => {
  const body = await readBody<{ uri?: string | null, deviceId?: string | null, shuffle?: boolean }>(event) ?? {}
  const db = getDb()
  return guard(async () => {
    const uri = body.uri ?? null
    const payload = !uri ? undefined : uri.includes(':track:') ? { uris: [uri] } : { context_uri: uri }
    let deviceId = body.deviceId ?? null
    if (!deviceId) {
      const r = await api<{ devices: Array<{ id: string, is_active: boolean, type: string }> }>(db, 'GET', '/me/player/devices')
      const list = r?.devices ?? []
      if (!list.some(d => d.is_active)) deviceId = (list.find(d => d.type === 'Computer') ?? list[0])?.id ?? null
    }
    const q = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''
    if (typeof body.shuffle === 'boolean') await api(db, 'PUT', `/me/player/shuffle?state=${body.shuffle}${deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : ''}`).catch(() => null)
    await api(db, 'PUT', `/me/player/play${q}`, payload ?? {})
    return { ok: true }
  })
})

export const pause = defineEventHandler(() => guard(async () => {
  await api(getDb(), 'PUT', '/me/player/pause')
  return { ok: true }
}))
export const next = defineEventHandler(() => guard(async () => {
  await api(getDb(), 'POST', '/me/player/next')
  return { ok: true }
}))
export const previous = defineEventHandler(() => guard(async () => {
  await api(getDb(), 'POST', '/me/player/previous')
  return { ok: true }
}))
export const volume = defineEventHandler(async (event) => {
  const { percent } = await readBody<{ percent: number }>(event)
  return guard(async () => {
    await api(getDb(), 'PUT', `/me/player/volume?volume_percent=${Math.max(0, Math.min(100, Math.round(Number(percent) || 0)))}`)
    return { ok: true }
  })
})
export const shuffle = defineEventHandler(async (event) => {
  const { state } = await readBody<{ state: boolean }>(event)
  return guard(async () => {
    await api(getDb(), 'PUT', `/me/player/shuffle?state=${!!state}`)
    return { ok: true }
  })
})

export const playlists = defineEventHandler(() => guard(async (): Promise<SpotifyItem[]> => {
  const db = getDb()
  const out: SpotifyItem[] = []
  let url: string | null = '/me/playlists?limit=50'
  for (let page = 0; url && page < 6; page++) {
    const r: { items: Parameters<typeof toItem>[0][], next: string | null } | null = await api(db, 'GET', url)
    for (const i of r?.items ?? []) {
      const item = toItem(i)
      if (item) out.push(item)
    }
    url = r?.next ?? null
  }
  return out
}))

export const search = defineEventHandler(event => guard(async (): Promise<SpotifyItem[]> => {
  const q = String(getQuery(event).q ?? '').trim()
  if (!q) return []
  type Page = { items: Parameters<typeof toItem>[0][] } | undefined
  const r = await api<{ playlists?: Page, albums?: Page, tracks?: Page, artists?: Page }>(getDb(), 'GET', `/search?type=playlist,album,track,artist&limit=6&q=${encodeURIComponent(q)}`)
  return [r?.playlists, r?.albums, r?.artists, r?.tracks].flatMap(p => (p?.items ?? []).map(toItem).filter((x): x is SpotifyItem => !!x))
}))

// --- scenes: the campaign's mood buttons ------------------------------------------
function loadScenes(campaignId: number): SpotifyScene[] {
  return getDb().prepare('SELECT id, name, uri, kind, image, sort_order FROM spotify_scenes WHERE campaign_id = ? ORDER BY sort_order, id').all(campaignId) as SpotifyScene[]
}
export const getScenes = defineEventHandler(event => loadScenes(requireCampaign(getDb(), getQuery(event).campaignId)))
export const addScene = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{ campaignId: number, name: string, uri: string, kind?: string, image?: string | null }>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  if (!body.uri?.startsWith('spotify:')) throw createError({ statusCode: 400, message: 'A Spotify link is required' })
  const order = (db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM spotify_scenes WHERE campaign_id = ?').get(campaignId) as { n: number }).n
  db.prepare('INSERT INTO spotify_scenes (campaign_id, name, uri, kind, image, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(campaignId, String(body.name ?? '').trim() || 'Scene', body.uri, body.kind ?? 'playlist', body.image ?? null, order)
  return loadScenes(campaignId)
})
export const updateScene = defineEventHandler(async (event) => {
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const row = db.prepare('SELECT campaign_id FROM spotify_scenes WHERE id = ?').get(id) as { campaign_id: number } | undefined
  if (!row) throw createError({ statusCode: 404, message: 'Scene not found' })
  const body = await readBody<{ name?: string }>(event) ?? {}
  if (typeof body.name === 'string' && body.name.trim()) db.prepare('UPDATE spotify_scenes SET name = ? WHERE id = ?').run(body.name.trim(), id)
  return loadScenes(row.campaign_id)
})
export const deleteScene = defineEventHandler((event) => {
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const row = db.prepare('SELECT campaign_id FROM spotify_scenes WHERE id = ?').get(id) as { campaign_id: number } | undefined
  if (!row) throw createError({ statusCode: 404, message: 'Scene not found' })
  db.prepare('DELETE FROM spotify_scenes WHERE id = ?').run(id)
  return loadScenes(row.campaign_id)
})
export const orderScenes = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{ campaignId: number, ids: number[] }>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const set = db.prepare('UPDATE spotify_scenes SET sort_order = ? WHERE id = ? AND campaign_id = ?')
  db.transaction(() => (body.ids ?? []).forEach((id, i) => set.run(i, id, campaignId)))()
  return loadScenes(campaignId)
})
