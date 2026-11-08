import { existsSync, mkdirSync, renameSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { getDatabasePath } from './paths'

/**
 * One-time data move for a hosted (web) install.
 *
 * Copying a desktop campaign onto a hosted server works in two steps:
 * 1. The database files are uploaded into a staging folder next to the live
 *    database (they can't overwrite it while the server has it open).
 * 2. On the next start, before the database is opened, the staged files are
 *    moved into place.
 *
 * Only active when DM_HERO_PASSPHRASE and DM_HERO_ALLOW_RESTORE are both set.
 */

export const DB_FILES = ['dm-hero.db', 'dm-hero.db-wal', 'dm-hero.db-shm'] as const

export function isRestoreEnabled(): boolean {
  return !!process.env.DM_HERO_PASSPHRASE && process.env.DM_HERO_ALLOW_RESTORE === '1'
}

export function getRestoreDir(): string {
  return join(dirname(getDatabasePath()), 'restore')
}

/** Move a staged database into place. Call before the database is opened. */
export function applyPendingRestore(): void {
  const stageDir = getRestoreDir()
  const stagedDb = join(stageDir, 'dm-hero.db')
  if (!existsSync(stagedDb)) return

  const dbPath = getDatabasePath()
  mkdirSync(dirname(dbPath), { recursive: true })

  // Clear the old database and its journal files first, so a stale WAL
  // can't be replayed onto the restored database.
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(dbPath + suffix, { force: true })
  }
  for (const file of DB_FILES) {
    const staged = join(stageDir, file)
    if (existsSync(staged)) {
      renameSync(staged, join(dirname(dbPath), file.replace('dm-hero.db', basenameOf(dbPath))))
    }
  }
  rmSync(stageDir, { recursive: true, force: true })
  console.log('📦 Restored database from staged upload')
}

function basenameOf(p: string): string {
  return p.split(/[\\/]/).pop() || 'dm-hero.db'
}
