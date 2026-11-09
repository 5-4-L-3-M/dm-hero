import { getDb } from '../../utils/db'
import { requireCampaign } from '../../utils/storyBoard'
import type { ClusterHeat } from '../../../types/story'

const WARMER: Record<ClusterHeat, ClusterHeat> = { cold: 'warm', warm: 'hot', hot: 'hot' }
const COOLER: Record<ClusterHeat, ClusterHeat> = { hot: 'warm', warm: 'cold', cold: 'cold' }
/** Untouched for this many sessions in a row → one step cooler */
const IDLE_SESSIONS_TO_COOL = 2

/**
 * POST /api/story/drift { campaignId, touched: [clusterId, …] } — run once per session (the session wrap does it).
 * Clusters something happened in warm up a step; the rest count an idle session and cool a step after two.
 * Pinned, archived and resolved clusters never drift. Returns what changed.
 */
export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody<{ campaignId: number, touched?: number[] }>(event)
  const campaignId = requireCampaign(db, body?.campaignId)
  const touched = new Set((body.touched ?? []).map(Number))
  const rows = db.prepare(`
    SELECT id, title, heat, idle_sessions FROM story_clusters
    WHERE campaign_id = ? AND archived_at IS NULL AND heat_pinned = 0 AND status != 'resolved'
  `).all(campaignId) as Array<{ id: number, title: string, heat: ClusterHeat, idle_sessions: number }>
  const set = db.prepare('UPDATE story_clusters SET heat = ?, idle_sessions = ? WHERE id = ?')
  const changes: Array<{ id: number, title: string, from: ClusterHeat, to: ClusterHeat }> = []
  db.transaction(() => {
    for (const c of rows) {
      let heat = c.heat
      let idle = c.idle_sessions + 1
      if (touched.has(c.id)) {
        heat = WARMER[c.heat]
        idle = 0
      }
      else if (idle >= IDLE_SESSIONS_TO_COOL) {
        heat = COOLER[c.heat]
        idle = 0
      }
      set.run(heat, idle, c.id)
      if (heat !== c.heat) changes.push({ id: c.id, title: c.title, from: c.heat, to: heat })
    }
  })()
  return { changes }
})
