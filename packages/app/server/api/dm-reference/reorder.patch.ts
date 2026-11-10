import { getDb } from '~~/server/utils/db'

/** Save a new section order: { ids: [3, 1, 2] } */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: number[] }>(event)
  const ids = Array.isArray(body?.ids) ? body!.ids.map(Number).filter(Boolean) : []
  const db = getDb()
  const upd = db.prepare('UPDATE dm_reference_sections SET sort_order = ? WHERE id = ?')
  db.transaction(() => ids.forEach((id, i) => upd.run(i, id)))()
  return { ok: true }
})
