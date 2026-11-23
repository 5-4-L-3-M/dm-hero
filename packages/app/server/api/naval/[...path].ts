import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import { getDb } from '../../utils/db'
import { SHIP_PRESETS, normalizeShip, shipFromPreset, type EncounterShip, type ShipData, type ShipSide } from '~~/types/ship'

/**
 * Naval combat (ships in an encounter):
 *   GET    /api/naval/encounter/:id            → { detailed, log, ships }
 *   PATCH  /api/naval/encounter/:id            { detailed?, log? }
 *   POST   /api/naval/ships                    { encounterId, name, side?, data? }
 *   PATCH  /api/naval/ships/:id                { name?, side?, data?, sort_order? }
 *   DELETE /api/naval/ships/:id
 * One catch-all file so the typed route list stays small.
 */
interface Row { id: number, encounter_id: number, side: string, name: string, data: string, sort_order: number }

const sideOf = (v: unknown): ShipSide => (v === 'enemy' ? 'enemy' : 'ally')

function toShip(r: Row): EncounterShip {
  let data: unknown = {}
  try {
    data = JSON.parse(r.data)
  }
  catch {
    data = {}
  }
  return { id: r.id, encounter_id: r.encounter_id, side: sideOf(r.side), name: r.name, sort_order: r.sort_order, data: normalizeShip(data as never) }
}

const oneShip = (id: number | bigint) => {
  const r = getDb().prepare('SELECT * FROM encounter_ships WHERE id = ?').get(id) as Row | undefined
  return r ? toShip(r) : null
}

function requireEncounter(id: unknown) {
  const n = Number(id)
  const row = n ? getDb().prepare('SELECT id, naval_log, naval_detailed FROM encounters WHERE id = ? AND deleted_at IS NULL').get(n) as { id: number, naval_log: string | null, naval_detailed: number } | undefined : undefined
  if (!row) throw createError({ statusCode: 404, message: 'Encounter not found' })
  return row
}

function readLog(raw: string | null): unknown[] {
  try {
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v : []
  }
  catch {
    return []
  }
}

const routes: SubRoutes = {
  'encounter/:id': {
    GET: defineEventHandler((event) => {
      const enc = requireEncounter(getRouterParam(event, 'id'))
      const ships = (getDb().prepare('SELECT * FROM encounter_ships WHERE encounter_id = ? ORDER BY sort_order, id').all(enc.id) as Row[]).map(toShip)
      return { detailed: !!enc.naval_detailed, log: readLog(enc.naval_log), ships }
    }),
    PATCH: defineEventHandler(async (event) => {
      const enc = requireEncounter(getRouterParam(event, 'id'))
      const body = await readBody<{ detailed?: boolean, log?: unknown[] }>(event) ?? {}
      const db = getDb()
      if (body.detailed !== undefined) db.prepare('UPDATE encounters SET naval_detailed = ? WHERE id = ?').run(body.detailed ? 1 : 0, enc.id)
      if (Array.isArray(body.log)) db.prepare('UPDATE encounters SET naval_log = ? WHERE id = ?').run(JSON.stringify(body.log.slice(-100)), enc.id)
      const after = requireEncounter(enc.id)
      return { detailed: !!after.naval_detailed, log: readLog(after.naval_log) }
    }),
  },
  'ships': {
    POST: defineEventHandler(async (event) => {
      const body = await readBody<{ encounterId?: number, name?: string, side?: string, data?: unknown }>(event) ?? {}
      const enc = requireEncounter(body.encounterId)
      const name = String(body.name ?? '').trim().slice(0, 200)
      if (!name) throw createError({ statusCode: 400, message: 'A ship name is required' })
      // A preset key fills in the ship table's stats; anything else passed overrides them
      const given = (body.data && typeof body.data === 'object' ? body.data : {}) as Partial<ShipData>
      const preset = SHIP_PRESETS.find(p => p.key === given.preset)
      const data = normalizeShip(preset ? { ...shipFromPreset(preset), ...given } : given)
      if (preset && given.hull === undefined) data.hull = data.hullMax
      const db = getDb()
      const next = (db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM encounter_ships WHERE encounter_id = ?').get(enc.id) as { n: number }).n
      const id = db.prepare('INSERT INTO encounter_ships (encounter_id, side, name, data, sort_order) VALUES (?, ?, ?, ?, ?)')
        .run(enc.id, sideOf(body.side), name, JSON.stringify(data), next).lastInsertRowid
      return oneShip(id)
    }),
  },
  'ships/:id': {
    PATCH: defineEventHandler(async (event) => {
      const id = Number(getRouterParam(event, 'id'))
      if (!oneShip(id)) throw createError({ statusCode: 404, message: 'Ship not found' })
      const body = await readBody<{ name?: string, side?: string, data?: unknown, sort_order?: number }>(event) ?? {}
      const sets: string[] = []
      const vals: (string | number)[] = []
      if (body.name !== undefined) {
        const name = String(body.name).trim().slice(0, 200)
        if (!name) throw createError({ statusCode: 400, message: 'A ship name is required' })
        sets.push('name = ?')
        vals.push(name)
      }
      if (body.side !== undefined) {
        sets.push('side = ?')
        vals.push(sideOf(body.side))
      }
      if (body.data !== undefined) {
        sets.push('data = ?')
        vals.push(JSON.stringify(normalizeShip(body.data as never)))
      }
      if (body.sort_order !== undefined && Number.isFinite(Number(body.sort_order))) {
        sets.push('sort_order = ?')
        vals.push(Math.round(Number(body.sort_order)))
      }
      if (sets.length) getDb().prepare(`UPDATE encounter_ships SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id)
      return oneShip(id)
    }),
    DELETE: defineEventHandler((event) => {
      getDb().prepare('DELETE FROM encounter_ships WHERE id = ?').run(Number(getRouterParam(event, 'id')))
      return { ok: true }
    }),
  },
}

export default defineEventHandler(event => dispatchSubRoute(event, routes, getRouterParam(event, 'path') ?? ''))
