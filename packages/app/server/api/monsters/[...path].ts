import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import { getDb } from '../../utils/db'
import { requireCampaign } from '../../utils/storyBoard'
import { convertNpcText, getMonster, getNpcBlock, listMonsters, saveMonster, setNpcBlock, type MonsterInput } from '../../utils/monsters'
import type { StatBlock } from '../../../types/statblock'

/**
 * Monster library and stat blocks:
 *   GET    /api/monsters?campaignId            → summaries (SRD creatures are added on first visit)
 *   GET    /api/monsters/:id                   → full monster
 *   POST   /api/monsters { campaignId, name, block … } · PATCH /:id · DELETE /:id · POST /:id/copy
 *   GET    /api/monsters/npc/:entityId         → an NPC's stat block (or null)
 *   PUT    /api/monsters/npc/:entityId { block } (null removes it)
 *   POST   /api/monsters/npc/:entityId/convert → read the stats out of the NPC's notes
 */
function owned(id: unknown) {
  const m = getMonster(getDb(), Number(id))
  if (!m) throw createError({ statusCode: 404, message: 'Monster not found' })
  return m
}
function npc(id: unknown) {
  const row = getDb().prepare('SELECT e.id, e.description FROM entities e JOIN entity_types t ON t.id = e.type_id WHERE e.id = ? AND e.deleted_at IS NULL AND t.name IN (\'NPC\', \'Player\')').get(Number(id)) as { id: number, description: string | null } | undefined
  if (!row) throw createError({ statusCode: 404, message: 'NPC not found' })
  return row
}

export const monsterRoutes: SubRoutes = {
  '': {
    GET: defineEventHandler(async (event) => {
      const db = getDb()
      return await listMonsters(db, requireCampaign(db, getQuery(event).campaignId))
    }),
    POST: defineEventHandler(async (event) => {
      const db = getDb()
      const body = await readBody<MonsterInput & { campaignId: number }>(event)
      return getMonster(db, saveMonster(db, requireCampaign(db, body?.campaignId), null, body))
    }),
  },
  ':id': {
    GET: defineEventHandler(event => owned(getRouterParam(event, 'id'))),
    PATCH: defineEventHandler(async (event) => {
      const m = owned(getRouterParam(event, 'id'))
      const body = await readBody<MonsterInput>(event) ?? {}
      return getMonster(getDb(), saveMonster(getDb(), m.campaign_id, m.id, body))
    }),
    DELETE: defineEventHandler((event) => {
      const m = owned(getRouterParam(event, 'id'))
      getDb().prepare('DELETE FROM monsters WHERE id = ?').run(m.id)
      return { ok: true }
    }),
  },
  ':id/copy': {
    POST: defineEventHandler((event) => {
      const m = owned(getRouterParam(event, 'id'))
      return getMonster(getDb(), saveMonster(getDb(), m.campaign_id, null, { name: `${m.name} (copy)`, description: m.description, image_url: m.image_url, tags: m.tags.filter(t => t !== 'SRD'), block: m.block }))
    }),
  },
  'npc/:entityId': {
    GET: defineEventHandler(event => ({ block: getNpcBlock(getDb(), npc(getRouterParam(event, 'entityId')).id) })),
    PUT: defineEventHandler(async (event) => {
      const n = npc(getRouterParam(event, 'entityId'))
      const body = await readBody<{ block: StatBlock | null }>(event)
      setNpcBlock(getDb(), n.id, body?.block ?? null)
      return { block: getNpcBlock(getDb(), n.id) }
    }),
  },
  'npc/:entityId/convert': {
    // { apply: false } → preview { block, rest }. { apply: true, block?, trimNotes? } → saves the block
    // (keeping the original notes as a backup) and, if asked, takes the stat lines out of the notes.
    POST: defineEventHandler(async (event) => {
      const n = npc(getRouterParam(event, 'entityId'))
      const body = await readBody<{ apply?: boolean, block?: StatBlock, trimNotes?: boolean }>(event) ?? {}
      const found = convertNpcText(n.description ?? '')
      if (!body.apply) return found
      const block = body.block ?? found?.block
      if (!block) throw createError({ statusCode: 400, message: 'No stats found in the notes' })
      const db = getDb()
      db.transaction(() => {
        setNpcBlock(db, n.id, block, n.description)
        if (body.trimNotes && found) db.prepare('UPDATE entities SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(found.rest, n.id)
      })()
      return { block: getNpcBlock(db, n.id), rest: body.trimNotes && found ? found.rest : n.description }
    }),
  },
}

export default defineEventHandler(event => dispatchSubRoute(event, monsterRoutes, getRouterParam(event, 'path') ?? ''))
