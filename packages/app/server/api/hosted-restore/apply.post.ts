import { existsSync } from 'fs'
import { join } from 'path'
import { getRestoreDir, isRestoreEnabled } from '~~/server/utils/hostedRestore'

/**
 * Finish the move: restart the server so the staged database is swapped in
 * before it opens. The host (Render) brings the service straight back up.
 */
export default defineEventHandler(() => {
  if (!isRestoreEnabled()) throw createError({ statusCode: 404 })
  if (!existsSync(join(getRestoreDir(), 'dm-hero.db'))) {
    throw createError({ statusCode: 400, message: 'No staged database' })
  }
  setTimeout(() => process.exit(0), 500)
  return { ok: true, restarting: true }
})
