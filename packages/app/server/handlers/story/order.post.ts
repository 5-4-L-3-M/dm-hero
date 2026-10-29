import { getDb } from '../../utils/db'
import { clusterInCampaign, requireCampaign } from '../../utils/storyBoard'

/**
 * POST /api/story/order — save drag & drop in one call:
 *   clusters: [id, …]                         cluster order
 *   lists:    [{ clusterId: id|null, beatIds }] beats per cluster (null = sparks shelf)
 *   tray:     [beatId, …]                      next-session tray (replaces it)
 */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{
    campaignId: number
    clusters?: number[]
    lists?: Array<{ clusterId: number | null, beatIds: number[] }>
    tray?: number[]
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
  })()
  return { ok: true }
})
