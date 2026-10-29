// Story Board: storylines → clusters → beats, the sparks shelf, the
// next-session tray, quests and faction agendas. Shared by server and client.

export const STORY_COLOR_COUNT = 12
export const BEAT_KINDS = ['scene', 'combat', 'social', 'reveal', 'hook', 'travel'] as const
export const BEAT_STATUSES = ['idea', 'ready', 'played', 'cut'] as const
export const CLUSTER_HEATS = ['cold', 'warm', 'hot'] as const
export const CLUSTER_STATUSES = ['active', 'dormant', 'resolved'] as const
export const COLOR_BY = ['storyline', 'heat', 'region', 'status'] as const
export const QUEST_STATUSES = ['rumor', 'active', 'completed', 'failed'] as const
export const AGENDA_STATUSES = ['active', 'achieved', 'foiled'] as const
export const CLOCK_SIZES = [4, 6, 8, 10, 12] as const
/** Relation type linking a quest to the entries involved in it */
export const QUEST_INVOLVED_RELATION = 'involved'

export type BeatKind = typeof BEAT_KINDS[number]
export type BeatStatus = typeof BEAT_STATUSES[number]
export type ClusterHeat = typeof CLUSTER_HEATS[number]
export type ClusterStatus = typeof CLUSTER_STATUSES[number]
export type ColorBy = typeof COLOR_BY[number]
export type QuestStatus = typeof QUEST_STATUSES[number]
export type AgendaStatus = typeof AGENDA_STATUSES[number]

export const BEAT_KIND_ICONS: Record<BeatKind, string> = {
  scene: 'mdi-drama-masks',
  combat: 'mdi-sword-cross',
  social: 'mdi-account-voice',
  reveal: 'mdi-eye-outline',
  hook: 'mdi-hook',
  travel: 'mdi-map-marker-path',
}

export const QUEST_STATUS_ICONS: Record<QuestStatus, string> = {
  rumor: 'mdi-ear-hearing',
  active: 'mdi-flag-variant',
  completed: 'mdi-check-decagram',
  failed: 'mdi-close-octagon',
}

export interface LinkedEntity {
  id: number
  name: string
  type: string // entity type name: NPC, Location, Item, Faction, Lore, Player, Quest
}

export interface StoryLine {
  id: number
  name: string
  color: number // 1..12 → theme color "story-N"
  sort_order: number
}

export interface StoryCluster {
  id: number
  storyline_id: number | null
  title: string
  notes: string | null
  heat: ClusterHeat
  status: ClusterStatus
  location_id: number | null
  location_name: string | null
  quest_id: number | null
  quest_name: string | null
  collapsed: boolean
  sort_order: number
}

export interface StoryBeat {
  id: number
  cluster_id: number | null // null = on the sparks shelf
  title: string
  body: string | null
  kind: BeatKind
  status: BeatStatus
  location_id: number | null
  location_name: string | null
  sort_order: number
  tray_order: number | null // set = in the next-session tray
  played_session_id: number | null
  entities: LinkedEntity[]
}

export interface StoryBoardSettings {
  color_by: ColorBy
  party_location_id: number | null
}

export interface StoryBoard {
  settings: StoryBoardSettings
  storylines: StoryLine[]
  clusters: StoryCluster[]
  beats: StoryBeat[]
}

export interface QuestObjective {
  text: string
  done: boolean
}

export interface Quest {
  id: number
  name: string
  description: string | null
  status: QuestStatus
  giver_id: number | null
  giver_name: string | null
  giver_type: string | null
  involved: LinkedEntity[] // entries linked to the quest (relation type "involved")
  location_id: number | null
  location_name: string | null
  storyline_id: number | null
  reward: string | null
  objectives: QuestObjective[]
  sort_order: number
  updated_at: string
}

export interface FactionAgenda {
  id: number
  faction_id: number
  faction_name: string
  goal: string
  next_step: string | null
  clock_size: number
  clock_filled: number
  status: AgendaStatus
  sort_order: number
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function oneOf<T extends string>(list: readonly T[], value: unknown, fallback: T): T {
  return (list as readonly unknown[]).includes(value) ? value as T : fallback
}

/** Storyline color index kept in 1..STORY_COLOR_COUNT. */
export function clampStoryColor(value: unknown): number {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n >= 1 && n <= STORY_COLOR_COUNT ? n : 1
}

/** Clock segments filled, kept within 0..size. */
export function clampClock(filled: unknown, size: unknown): { size: number, filled: number } {
  const s = (CLOCK_SIZES as readonly number[]).includes(Number(size)) ? Number(size) : 6
  const f = Math.max(0, Math.min(s, Math.round(Number(filled) || 0)))
  return { size: s, filled: f }
}

/** First storyline color not used yet (wraps around after 6). */
export function nextStoryColor(used: number[]): number {
  for (let c = 1; c <= STORY_COLOR_COUNT; c++) if (!used.includes(c)) return c
  return (used.length % STORY_COLOR_COUNT) + 1
}

const HEAT_COLORS: Record<ClusterHeat, string> = { cold: 'info', warm: 'warning', hot: 'error' }
// success / warning / info differ in every theme (secondary can equal success, e.g. Nocturne)
const STATUS_COLORS: Record<ClusterStatus, string> = { active: 'success', dormant: 'warning', resolved: 'info' }
export const NO_COLOR = 'surface-variant'

/**
 * The theme color name for a cluster under the chosen color-by parameter.
 * Story colors ("story-1".."story-6") come from the active theme, so they
 * always match it.
 */
export function clusterColor(
  cluster: Pick<StoryCluster, 'storyline_id' | 'heat' | 'status' | 'location_id'>,
  colorBy: ColorBy,
  storylines: Pick<StoryLine, 'id' | 'color'>[],
  regionIds: number[] = [],
): string {
  switch (colorBy) {
    case 'heat': return HEAT_COLORS[cluster.heat] ?? NO_COLOR
    case 'status': return STATUS_COLORS[cluster.status] ?? NO_COLOR
    case 'region': {
      if (!cluster.location_id) return NO_COLOR
      const i = regionIds.indexOf(cluster.location_id)
      return `story-${((i >= 0 ? i : cluster.location_id) % STORY_COLOR_COUNT) + 1}`
    }
    default: {
      const line = storylines.find(s => s.id === cluster.storyline_id)
      return line ? `story-${clampStoryColor(line.color)}` : NO_COLOR
    }
  }
}

/** Colors for the beats' heat / status legend chips. */
export function heatColor(heat: ClusterHeat): string {
  return HEAT_COLORS[heat]
}
export function statusColor(status: ClusterStatus): string {
  return STATUS_COLORS[status]
}

/**
 * Locations "near" the party: where they are, every place inside it, and
 * every place it sits in (the region, the country). Open-world filter.
 */
export function nearbyLocationIds(partyLocationId: number | null, locations: { id: number, parent_id: number | null }[]): Set<number> {
  const near = new Set<number>()
  if (!partyLocationId) return near
  const parentOf = new Map(locations.map(l => [l.id, l.parent_id]))
  // Up: the containing places
  let cur: number | null | undefined = partyLocationId
  while (cur && !near.has(cur)) {
    near.add(cur)
    cur = parentOf.get(cur)
  }
  // Down: everything inside the party's location
  const children = new Map<number, number[]>()
  for (const l of locations) {
    if (l.parent_id) children.set(l.parent_id, [...(children.get(l.parent_id) ?? []), l.id])
  }
  const stack = [partyLocationId]
  while (stack.length) {
    const id = stack.pop()!
    for (const c of children.get(id) ?? []) {
      if (!near.has(c)) {
        near.add(c)
        stack.push(c)
      }
    }
  }
  return near
}

/** Quest metadata in the entities table → clean values. */
export function readQuestMetadata(raw: unknown): Pick<Quest, 'status' | 'giver_id' | 'storyline_id' | 'reward' | 'objectives' | 'sort_order'> {
  let m: Record<string, unknown> = {}
  if (typeof raw === 'string') {
    try {
      m = JSON.parse(raw) ?? {}
    }
    catch {
      m = {}
    }
  }
  else if (raw && typeof raw === 'object') m = raw as Record<string, unknown>
  const num = (v: unknown) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null)
  const objectives = Array.isArray(m.objectives)
    ? m.objectives
        .map(o => (typeof o === 'string' ? { text: o, done: false } : { text: String((o as QuestObjective)?.text ?? ''), done: !!(o as QuestObjective)?.done }))
        .filter(o => o.text.trim())
    : []
  return {
    status: oneOf(QUEST_STATUSES, m.status, 'rumor'),
    giver_id: num(m.giver_id),
    storyline_id: num(m.storyline_id),
    reward: typeof m.reward === 'string' && m.reward.trim() ? m.reward : null,
    objectives,
    sort_order: Number(m.sort_order) || 0,
  }
}
