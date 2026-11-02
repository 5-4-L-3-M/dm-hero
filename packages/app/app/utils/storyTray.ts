import type { StoryBeat, StoryCluster } from '~~/types/story'

/** One cluster's share of the next-session tray, in tray order. */
export interface TrayGroup {
  /** cluster id, or "sparks" for beats without a cluster */
  key: string
  cluster: StoryCluster | null
  beats: StoryBeat[]
}

/** Groups bigger than this start folded (open time like "Free time in the city"). */
export const TRAY_BIG_GROUP = 8

/**
 * Splits the tray by cluster. Groups keep the order of their first beat in
 * the tray, so the main scene list stays on top.
 */
export function groupTray(tray: StoryBeat[], clusters: StoryCluster[]): TrayGroup[] {
  const groups: TrayGroup[] = []
  const byKey = new Map<string, TrayGroup>()
  for (const beat of tray) {
    const key = beat.cluster_id ? String(beat.cluster_id) : 'sparks'
    let g = byKey.get(key)
    if (!g) {
      g = { key, cluster: clusters.find(c => c.id === beat.cluster_id) ?? null, beats: [] }
      byKey.set(key, g)
      groups.push(g)
    }
    g.beats.push(beat)
  }
  return groups
}

/** Tray position (1-based) of every beat, for the numbers on the tray and run sheet. */
export function trayNumbers(tray: StoryBeat[]): Map<number, number> {
  return new Map(tray.map((b, i) => [b.id, i + 1]))
}

/** A group's tray order after one group was reordered by drag & drop. */
export function reorderTray(groups: TrayGroup[], key: string, beats: StoryBeat[]): number[] {
  return groups.flatMap(g => (g.key === key ? beats : g.beats)).map(b => b.id)
}
