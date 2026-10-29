import { getDb } from '../../../utils/db'
import { entityInCampaign, loadAgendas, nextSortOrder, requireCampaign } from '../../../utils/storyBoard'
import { AGENDA_STATUSES, clampClock, oneOf } from '../../../../types/story'

/** POST /api/story/agendas { campaignId, faction_id, goal, next_step?, clock_size?, clock_filled?, status? } */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<Record<string, unknown>>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const factionId = entityInCampaign(db, campaignId, body.faction_id, 'Faction')
  if (!factionId) throw createError({ statusCode: 400, message: 'A faction of this campaign is required' })
  const goal = String(body.goal ?? '').trim()
  if (!goal) throw createError({ statusCode: 400, message: 'Goal is required' })
  const clock = clampClock(body.clock_filled, body.clock_size)
  const order = nextSortOrder(db, 'SELECT MAX(sort_order) AS m FROM faction_agendas WHERE faction_id = ?', factionId)
  const r = db.prepare(`
    INSERT INTO faction_agendas (campaign_id, faction_id, goal, next_step, clock_size, clock_filled, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(campaignId, factionId, goal, typeof body.next_step === 'string' && body.next_step.trim() ? body.next_step : null, clock.size, clock.filled, oneOf(AGENDA_STATUSES, body.status, 'active'), order)
  return loadAgendas(db, campaignId).find(a => a.id === Number(r.lastInsertRowid))
})
