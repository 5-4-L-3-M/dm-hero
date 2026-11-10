import { getDb } from '~~/server/utils/db'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  getDb().prepare('DELETE FROM dm_reference_sections WHERE id = ?').run(id)
  return { ok: true }
})
