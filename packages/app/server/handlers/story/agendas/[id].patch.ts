import { getDb } from '../../../utils/db'
import { loadAgendas, requireRow } from '../../../utils/storyBoard'
import { AGENDA_STATUSES, clampClock, oneOf } from '../../../../types/story'

/** PATCH /api/story/agendas/:id — only the fields sent change. Filling the clock completely does not end the agenda by itself. */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const row = requireRow(db, 'faction_agendas', getRouterParam(event, 'id'))
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const a = loadAgendas(db, row.campaign_id).find(x => x.id === row.id)
  if (!a) throw createError({ statusCode: 404, message: 'Not found' })
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const clock = clampClock(has('clock_filled') ? body.clock_filled : a.clock_filled, has('clock_size') ? body.clock_size : a.clock_size)
  db.prepare(`
    UPDATE faction_agendas SET goal = ?, next_step = ?, clock_size = ?, clock_filled = ?, status = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    has('goal') ? String(body.goal ?? '').trim() || a.goal : a.goal,
    has('next_step') ? (typeof body.next_step === 'string' && body.next_step.trim() ? body.next_step : null) : a.next_step,
    clock.size,
    clock.filled,
    has('status') ? oneOf(AGENDA_STATUSES, body.status, a.status) : a.status,
    has('sort_order') ? Number(body.sort_order) || 0 : a.sort_order,
    row.id,
  )
  return loadAgendas(db, row.campaign_id).find(x => x.id === row.id)
})
