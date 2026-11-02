import type Database from 'better-sqlite3'
import { parseStatText, type StatBlock } from '../../types/statblock'
import type { Monster, MonsterSummary } from '../../types/monster'

// Monster library: the official SRD creatures (copied into each campaign once, editable),
// plus the DM's own. Stat blocks for NPCs live beside their entry (entity_statblocks).

export interface SrdMonster { key: string, name: string, description: string | null, block: StatBlock }

export function crNumber(cr: string | null | undefined): number | null {
  if (!cr) return null
  if (cr.includes('/')) {
    const [a, b] = cr.split('/').map(Number)
    return a && b ? a / b : null
  }
  const n = Number(cr)
  return Number.isFinite(n) ? n : null
}

let srdCache: SrdMonster[] | null = null
/** The bundled SRD bestiary (server asset, read once) */
async function srdMonsters(): Promise<SrdMonster[]> {
  if (!srdCache) {
    const raw = await useStorage('assets:server').getItem<SrdMonster[] | string>('srd-monsters.json')
    srdCache = typeof raw === 'string' ? JSON.parse(raw) as SrdMonster[] : (raw ?? [])
  }
  return srdCache
}

/** First visit: the SRD bestiary goes into the campaign (only once — deleted ones stay deleted) */
export async function seedSrd(db: Database.Database, campaignId: number, list?: SrdMonster[]) {
  if (db.prepare('SELECT 1 FROM monsters_seeded WHERE campaign_id = ?').get(campaignId)) return
  const srd = list ?? await srdMonsters()
  const ins = db.prepare('INSERT INTO monsters (campaign_id, srd_key, name, description, cr_num, block, tags) VALUES (?, ?, ?, ?, ?, ?, ?)')
  db.transaction(() => {
    for (const m of srd) ins.run(campaignId, m.key, m.name, m.description, crNumber(m.block.cr), JSON.stringify(m.block), 'SRD')
    db.prepare('INSERT INTO monsters_seeded (campaign_id) VALUES (?)').run(campaignId)
  })()
}

interface MonsterRow { id: number, campaign_id: number, srd_key: string | null, name: string, description: string | null, image_url: string | null, tags: string | null, block: string, updated_at: string }

function parseBlock(v: string | null | undefined): StatBlock {
  try {
    return v ? JSON.parse(v) as StatBlock : {}
  }
  catch {
    return {}
  }
}

export function toMonster(r: MonsterRow): Monster {
  return { id: r.id, srd: !!r.srd_key, name: r.name, description: r.description, image_url: r.image_url, tags: r.tags ? r.tags.split(',').map(x => x.trim()).filter(Boolean) : [], block: parseBlock(r.block), updated_at: r.updated_at }
}

export async function listMonsters(db: Database.Database, campaignId: number): Promise<MonsterSummary[]> {
  await seedSrd(db, campaignId)
  const rows = db.prepare('SELECT id, srd_key, name, image_url, tags, block FROM monsters WHERE campaign_id = ? ORDER BY name COLLATE NOCASE').all(campaignId) as MonsterRow[]
  return rows.map((r) => {
    const b = parseBlock(r.block)
    return { id: r.id, srd: !!r.srd_key, name: r.name, image_url: r.image_url, tags: r.tags ? r.tags.split(',').map(x => x.trim()).filter(Boolean) : [], cr: b.cr ?? null, kind: b.kind ?? null, size: b.size ?? null, ac: b.ac ?? null, hp: b.hp ?? null }
  })
}

export function getMonster(db: Database.Database, id: number): (Monster & { campaign_id: number }) | null {
  const r = db.prepare('SELECT * FROM monsters WHERE id = ?').get(id) as MonsterRow | undefined
  return r ? { ...toMonster(r), campaign_id: r.campaign_id } : null
}

export interface MonsterInput { name?: string, description?: string | null, image_url?: string | null, tags?: string[], block?: StatBlock }

export function saveMonster(db: Database.Database, campaignId: number, id: number | null, input: MonsterInput): number {
  const name = input.name?.trim()
  if (!id) {
    if (!name) throw createError({ statusCode: 400, message: 'A name is required' })
    return Number(db.prepare('INSERT INTO monsters (campaign_id, name, description, image_url, tags, cr_num, block) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(campaignId, name.slice(0, 200), input.description ?? null, input.image_url ?? null, (input.tags ?? []).join(', ') || null, crNumber(input.block?.cr), JSON.stringify(input.block ?? {})).lastInsertRowid)
  }
  const cur = getMonster(db, id)!
  const block = input.block ?? cur.block
  db.prepare('UPDATE monsters SET name = ?, description = ?, image_url = ?, tags = ?, cr_num = ?, block = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    (name || cur.name).slice(0, 200),
    input.description !== undefined ? input.description : cur.description,
    input.image_url !== undefined ? input.image_url : cur.image_url,
    (input.tags ?? cur.tags).join(', ') || null,
    crNumber(block.cr),
    JSON.stringify(block),
    id,
  )
  return id
}

// --- NPC stat blocks --------------------------------------------------------------

export function getNpcBlock(db: Database.Database, entityId: number): StatBlock | null {
  const r = db.prepare('SELECT block FROM entity_statblocks WHERE entity_id = ?').get(entityId) as { block: string } | undefined
  return r ? parseBlock(r.block) : null
}

export function setNpcBlock(db: Database.Database, entityId: number, block: StatBlock | null, sourceText?: string | null) {
  if (!block) {
    db.prepare('DELETE FROM entity_statblocks WHERE entity_id = ?').run(entityId)
    return
  }
  db.prepare(`
    INSERT INTO entity_statblocks (entity_id, block, source_text) VALUES (?, ?, ?)
    ON CONFLICT(entity_id) DO UPDATE SET block = excluded.block, source_text = COALESCE(excluded.source_text, entity_statblocks.source_text), updated_at = CURRENT_TIMESTAMP
  `).run(entityId, JSON.stringify(block), sourceText ?? null)
}

/** Read an NPC's stats out of their description: the block, and the description without those lines */
export function convertNpcText(description: string): { block: StatBlock, rest: string } | null {
  const parsed = parseStatText(description)
  if (!parsed) return null
  const used = new Set(parsed.used)
  const rest = description.split(/\r?\n/).filter(l => !used.has(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { block: parsed.block, rest }
}
