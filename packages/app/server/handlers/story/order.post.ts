import { getDb } from '../../utils/db'
import { clusterInCampaign, questTypeId, questlineInCampaign, requireCampaign } from '../../utils/storyBoard'

/**
 * POST /api/story/order — save drag & drop in one call:
 *   clusters: [id, …]                         cluster order
 *   lists:    [{ clusterId: id|null, beatIds }] beats per cluster (null = sparks shelf)
 *   tray:     [beatId, …]                      next-session tray (replaces it)
 *   questlines: [id, …]                       questline (Timeline row) order
 *   chains:   [{ questlineId: id|null, questIds }] quests in order per questline
 */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{
    campaignId: number
    clusters?: number[]
    lists?: Array<{ clusterId: number | null, beatIds: number[] }>
    tray?: number[]
    questlines?: number[]
    chains?: Array<{ questlineId: number | null, questIds: number[] }>
  }>(event)
  const campaignId = requireCampaign(db, body?.campaignId)

  db.transaction(() => {
    if (Array.isArray(body.clusters)) {
      const set = db.prepare('UPDATE story_clusters SET sort_order = ? WHERE id = ? AND campaign_id = ?')
      body.clusters.forEach((id, i) => set.run(i, Number(id), campaignId))
    }
    if (Array.isArray(body.lists)) {
      const set = db.prepare('UPDATE story_beats SET cluster_id = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND campaign_id = ?')
      for (const list of body.lists) {
        const clusterId = list.clusterId === null ? null : clusterInCampaign(db, campaignId, list.clusterId)
        if (list.clusterId !== null && !clusterId) continue
        ;(list.beatIds ?? []).forEach((id, i) => set.run(clusterId, i, Number(id), campaignId))
      }
    }
    if (Array.isArray(body.tray)) {
      db.prepare('UPDATE story_beats SET tray_order = NULL WHERE campaign_id = ?').run(campaignId)
      const set = db.prepare('UPDATE story_beats SET tray_order = ? WHERE id = ? AND campaign_id = ?')
      body.tray.forEach((id, i) => set.run(i, Number(id), campaignId))
    }
    if (Array.isArray(body.questlines)) {
      const set = db.prepare('UPDATE story_questlines SET sort_order = ? WHERE id = ? AND campaign_id = ?')
      body.questlines.forEach((id, i) => set.run(i, Number(id), campaignId))
    }
    if (Array.isArray(body.chains)) {
      // Quest order lives in the quest's metadata
      const get = db.prepare('SELECT metadata FROM entities WHERE id = ? AND campaign_id = ? AND type_id = ? AND deleted_at IS NULL')
      const set = db.prepare('UPDATE entities SET metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      const typeId = questTypeId(db)
      for (const chain of body.chains) {
        const questlineId = chain.questlineId === null ? null : questlineInCampaign(db, campaignId, chain.questlineId)
        if (chain.questlineId !== null && !questlineId) continue
        ;(chain.questIds ?? []).forEach((id, i) => {
          const row = get.get(Number(id), campaignId, typeId) as { metadata: string | null } | undefined
          if (!row) return
          let m: Record<string, unknown> = {}
          try {
            m = row.metadata ? JSON.parse(row.metadata) ?? {} : {}
          }
          catch {
            m = {}
          }
          set.run(JSON.stringify({ ...m, questline_id: questlineId, questline_order: i }), Number(id))
        })
      }
    }
  })()
  return { ok: true }
})
