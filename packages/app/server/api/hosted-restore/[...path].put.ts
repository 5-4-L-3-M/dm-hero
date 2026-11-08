import { createWriteStream, mkdirSync, renameSync } from 'fs'
import { dirname, join, normalize, sep } from 'path'
import { pipeline } from 'stream/promises'
import { getUploadPath } from '~~/server/utils/paths'
import { DB_FILES, getRestoreDir, isRestoreEnabled } from '~~/server/utils/hostedRestore'

/**
 * Receive one file of a desktop campaign during the one-time move to a hosted
 * install. Raw file body. Paths:
 *   db/dm-hero.db, db/dm-hero.db-wal, db/dm-hero.db-shm  → staged, applied on restart
 *   uploads/<file>                                       → written straight into uploads
 */
export default defineEventHandler(async (event) => {
  if (!isRestoreEnabled()) throw createError({ statusCode: 404 })

  const rel = (getRouterParam(event, 'path') || '').replace(/\\/g, '/')
  if (!rel || rel.includes('..') || rel.includes('//')) {
    throw createError({ statusCode: 400, message: 'Bad path' })
  }

  let target: string
  if (rel.startsWith('db/')) {
    const name = rel.slice(3)
    if (!(DB_FILES as readonly string[]).includes(name)) {
      throw createError({ statusCode: 400, message: 'Unknown database file' })
    }
    target = join(getRestoreDir(), name)
  } else if (rel.startsWith('uploads/')) {
    const root = normalize(getUploadPath())
    target = normalize(join(root, rel.slice(8)))
    if (!target.startsWith(root + sep)) throw createError({ statusCode: 400, message: 'Bad path' })
  } else {
    throw createError({ statusCode: 400, message: 'Bad path' })
  }

  mkdirSync(dirname(target), { recursive: true })
  const tmp = `${target}.part`
  await pipeline(event.node.req, createWriteStream(tmp))
  renameSync(tmp, target)
  return { ok: true, path: rel }
})
