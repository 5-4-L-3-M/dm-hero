import { getDb } from '../../../../utils/db'
import { loadParticipants } from '../../../../utils/encounterParticipants'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const encounterId = getRouterParam(event, 'id')
  const participantId = getRouterParam(event, 'participantId')
  const body = await readBody(event)

  if (!encounterId || !participantId) {
    throw createError({ statusCode: 400, message: 'Encounter ID and Participant ID are required' })
  }

  const { initiative, current_hp, max_hp, temp_hp, is_ko, notes, sort_order } = body

  db.prepare(`
    UPDATE encounter_participants
    SET
      initiative = COALESCE(?, initiative),
      current_hp = COALESCE(?, current_hp),
      max_hp = COALESCE(?, max_hp),
      temp_hp = COALESCE(?, temp_hp),
      is_ko = COALESCE(?, is_ko),
      notes = COALESCE(?, notes),
      sort_order = COALESCE(?, sort_order)
    WHERE id = ? AND encounter_id = ?
  `).run(
    initiative ?? null,
    current_hp ?? null,
    max_hp ?? null,
    temp_hp ?? null,
    is_ko != null ? (is_ko ? 1 : 0) : null,
    notes ?? null,
    sort_order ?? null,
    participantId,
    encounterId,
  )

  const participant = loadParticipants(db, encounterId, participantId)[0]

  if (!participant) {
    throw createError({ statusCode: 404, message: 'Participant not found' })
  }

  return participant
})
