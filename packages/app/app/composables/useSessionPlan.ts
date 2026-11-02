import type { LinkedEntity, StoryBeat, StoryCluster } from '~~/types/story'

/** What the next session looks like, from the story board's tray. */
export function useSessionPlan() {
  const story = useStoryBoardStore()
  const tray = computed(() => story.tray)
  const clusterOf = (b: StoryBeat): StoryCluster | null => story.board?.clusters.find(c => c.id === b.cluster_id) ?? null

  /** Tray beats grouped by their quest / cluster, in tray order */
  const groups = computed(() => {
    const out: Array<{ key: string, cluster: StoryCluster | null, beats: StoryBeat[] }> = []
    for (const b of tray.value) {
      const c = clusterOf(b)
      const key = c ? `c${c.id}` : 'loose'
      let g = out.find(x => x.key === key)
      if (!g) out.push(g = { key, cluster: c, beats: [] })
      g.beats.push(b)
    }
    return out
  })

  /** Everyone tied to what's planned: the beats' and their clusters' links */
  const linked = computed(() => {
    const seen = new Map<string, LinkedEntity>()
    for (const b of tray.value) {
      for (const e of [...b.entities, ...(clusterOf(b)?.entities ?? [])]) seen.set(`${e.type}:${e.id}`, e)
    }
    return [...seen.values()]
  })
  const npcs = computed(() => linked.value.filter(e => e.type === 'NPC').sort((a, b) => a.name.localeCompare(b.name)))

  return { tray, groups, linked, npcs }
}

export interface SessionRow {
  id: number
  session_number: number | null
  title: string
  date: string | null
  summary: string | null
}

/** Plain text from a session summary (markdown / html) */
export function summaryText(s: string | null | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, ' ').replace(/[#*_`>]+/g, '').replace(/\s+\n/g, '\n').trim()
}
