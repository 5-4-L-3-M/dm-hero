import { getDb } from '../../utils/db'
import { requireCampaign } from '../../utils/storyBoard'
import { advanceWorld, priceAdjustment, loadRepEvents, loadReputation, logRepEvent, repSubject, setMet, suggestRipples } from '../../utils/reputation'
import type { RepKind } from '../../../types/reputation'

/**
 * Reputation endpoints (mounted under /api/reputation):
 *   GET    ?campaignId[&subjectId]                 tracks + met NPCs
 *   GET    events?campaignId&subjectId[&playerId&kind]   the log, newest first
 *   GET    ripples?campaignId&subjectId&delta[&kind]     suggested knock-on changes
 *   POST   events   { campaignId, subject_id, delta, player_id?, kind?, reason?, preset?, session_id?, ripples? }
 *   DELETE events/:id                               (its ripples go with it)
 *   POST   tracks   { campaignId, subject_id, player_id?, kind? }   show a track at 0 (split off a player)
 *   DELETE tracks?campaignId&subjectId&playerId&kind               remove a track and its log
 *   POST   met      { campaignId, npc_id, met }
 *   POST   advance  { campaignId }                  advance the world between sessions
 */
const kindOf = (v: unknown): RepKind => (v === 'notoriety' ? 'notoriety' : 'rep')

export const getReputation = defineEventHandler((event) => {
  const db = getDb()
  const q = getQuery(event)
  return loadReputation(db, requireCampaign(db, q.campaignId), Number(q.subjectId) || undefined)
})

export const getEvents = defineEventHandler((event) => {
  const db = getDb()
  const q = getQuery(event)
  const campaignId = requireCampaign(db, q.campaignId)
  return loadRepEvents(db, campaignId, Number(q.subjectId), q.playerId !== undefined ? Number(q.playerId) || 0 : undefined, q.kind ? kindOf(q.kind) : undefined)
})

export const getRipples = defineEventHandler((event) => {
  const db = getDb()
  const q = getQuery(event)
  return suggestRipples(db, requireCampaign(db, q.campaignId), Number(q.subjectId), Number(q.delta), kindOf(q.kind))
})

export const addEvent = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  return logRepEvent(db, campaignId, {
    subject_id: Number(body.subject_id),
    player_id: Number(body.player_id) || 0,
    kind: kindOf(body.kind),
    delta: Number(body.delta),
    reason: typeof body.reason === 'string' ? body.reason : null,
    preset: typeof body.preset === 'string' ? body.preset : null,
    session_id: body.session_id === undefined ? undefined : (Number(body.session_id) || null),
    ripples: Array.isArray(body.ripples) ? body.ripples as Array<{ subject_id: number, delta: number }> : [],
  })
})

export const removeEvent = defineEventHandler((event) => {
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const row = db.prepare('SELECT id FROM rep_events WHERE id = ?').get(id)
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  db.prepare('DELETE FROM rep_events WHERE id = ?').run(id)
  return { ok: true }
})

export const addTrack = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const s = repSubject(db, campaignId, body.subject_id)
  if (!s) throw createError({ statusCode: 400, message: 'Unknown NPC, faction or place' })
  db.prepare('INSERT OR IGNORE INTO rep_tracks (campaign_id, subject_id, player_id, kind) VALUES (?, ?, ?, ?)').run(campaignId, s.id, Number(body.player_id) || 0, kindOf(body.kind))
  return loadReputation(db, campaignId, s.id)
})

export const removeTrack = defineEventHandler((event) => {
  const db = getDb()
  const q = getQuery(event)
  const campaignId = requireCampaign(db, q.campaignId)
  const args = [campaignId, Number(q.subjectId), Number(q.playerId) || 0, kindOf(q.kind)]
  db.transaction(() => {
    db.prepare('DELETE FROM rep_events WHERE campaign_id = ? AND subject_id = ? AND player_id = ? AND kind = ?').run(...args)
    db.prepare('DELETE FROM rep_tracks WHERE campaign_id = ? AND subject_id = ? AND player_id = ? AND kind = ?').run(...args)
  })()
  return { ok: true }
})

export const markMet = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  if (!setMet(db, campaignId, Number(body.npc_id), !!body.met)) throw createError({ statusCode: 400, message: 'Unknown NPC' })
  return { ok: true }
})

export const price = defineEventHandler((event) => {
  const db = getDb()
  const q = getQuery(event)
  return priceAdjustment(db, requireCampaign(db, q.campaignId), Number(q.locationId))
})

export const advance = defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  return advanceWorld(db, requireCampaign(db, body?.campaignId))
})
