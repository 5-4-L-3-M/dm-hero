// Story Board: storylines → clusters → beats, the sparks shelf, the
// next-session tray, quests and faction agendas. Shared by server and client.

export const STORY_COLOR_COUNT = 12
export const BEAT_KINDS = ['scene', 'combat', 'social', 'reveal', 'hook', 'travel'] as const
export const BEAT_STATUSES = ['idea', 'ready', 'played', 'cut'] as const
export const CLUSTER_HEATS = ['cold', 'warm', 'hot'] as const
export const CLUSTER_STATUSES = ['active', 'dormant', 'resolved'] as const
export const COLOR_BY = ['storyline', 'heat', 'region', 'status'] as const
/** Board lanes: one row per value of this (or one lane for everything) */
export const GROUP_BY = ['storyline', 'heat', 'region', 'status', 'none'] as const
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
export type GroupBy = typeof GROUP_BY[number]
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
  /** Picture, when the list came with them (the linkable-entries list does) */
  image_url?: string | null
}

export const STORYLINE_KINDS = ['world', 'champion'] as const
export type StorylineKind = typeof STORYLINE_KINDS[number]

export interface StoryLine {
  id: number
  name: string
  color: number // 1..12 → theme color "story-N"
  /** Own color ("#a03cd8") instead of a theme one */
  custom_color?: string | null
  sort_order: number
  /** world = the main arc; champion = one player's own line */
  kind?: StorylineKind
  player_id?: number | null
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
  /** Entries linked to the whole cluster; new beats start with these (+ the quest's involved entries) */
  entities: LinkedEntity[]
  collapsed: boolean
  /** In the archive: hidden from the board, restore any time */
  archived: boolean
  sort_order: number
  /** Pinned heat never drifts between sessions */
  heat_pinned?: boolean
  /** Sessions in a row nothing in this cluster happened (heat drift) */
  idle_sessions?: number
  /** Optional progress clock (null = none) */
  clock_size?: number | null
  clock_filled?: number
  clock_label?: string | null
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
  /** In the archive: hidden from the board and tray, restore any time */
  archived: boolean
  entities: LinkedEntity[]
  /** Fires when the party is at this place / meets this person / (free text) */
  trigger_location_id?: number | null
  trigger_location_name?: string | null
  trigger_npc_id?: number | null
  trigger_npc_name?: string | null
  trigger_note?: string | null
}

export interface StoryBoardSettings {
  color_by: ColorBy
  party_location_id: number | null
  group_by: GroupBy
  compact: boolean
  /** Act names for the story map; null = the default Act 1–3 */
  acts: string[] | null
  /** World automation: tier changes drop reaction sparks */
  rep_consequences: boolean
  /** World automation: big moments and faction moves drop rumor sparks */
  rep_rumors: boolean
  /** The campaign's own color presets (hex), and theme presets it hid */
  palette: { custom: string[], hidden: number[] }
}

export const QUEST_IMPORTANCE = ['major', 'minor'] as const
export type QuestImportance = typeof QUEST_IMPORTANCE[number]

/** A chain of quests in order (Timeline row). A storyline can hold several. */
export interface Questline {
  id: number
  storyline_id: number | null
  name: string
  importance: QuestImportance
  optional: boolean
  notes: string | null
  sort_order: number
}

/** A place kit: who's at a location (from relations), its table note, and live beats there. */
export interface PlaceKit {
  id: number
  name: string
  parent_name: string | null
  note: string | null
  people: Array<{ id: number, name: string, role: string }>
  live_beats: number
}

export interface StoryBoard {
  settings: StoryBoardSettings
  storylines: StoryLine[]
  clusters: StoryCluster[]
  beats: StoryBeat[]
  questlines: Questline[]
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
  /** Everyone who gives the quest (giver_id = the first one) */
  givers: LinkedEntity[]
  giver_ids: number[]
  /** Players don't know who's behind it yet — show "Unknown" to them */
  giver_hidden: boolean
  /** null = same as its questline */
  importance: QuestImportance | null
  /** null = same as its questline */
  optional: boolean | null
  questline_id: number | null
  questline_order: number
  involved: LinkedEntity[] // entries linked to the quest (relation type "involved")
  location_id: number | null
  location_name: string | null
  storyline_id: number | null
  reward: string | null
  objectives: QuestObjective[]
  sort_order: number
  /** In the archive (hidden from the quest board) */
  archived: boolean
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

/** A storyline's color: its own hex, or the theme's "story-N" */
export function storylineColor(line: Pick<StoryLine, 'color' | 'custom_color'>): string {
  return line.custom_color && /^#[0-9a-f]{6}$/i.test(line.custom_color) ? line.custom_color : `story-${clampStoryColor(line.color)}`
}
/** CSS for a color that's either a theme name or a hex */
export function colorCss(c: string): string {
  return c.startsWith('#') ? c : `rgb(var(--v-theme-${c}))`
}
/** A hex color, or null */
export function cleanHex(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : null
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
  storylines: Pick<StoryLine, 'id' | 'color' | 'custom_color'>[],
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
      return line ? storylineColor(line) : NO_COLOR
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
export function readQuestMetadata(raw: unknown): Pick<Quest, 'status' | 'giver_id' | 'giver_ids' | 'giver_hidden' | 'importance' | 'optional' | 'questline_id' | 'questline_order' | 'storyline_id' | 'reward' | 'objectives' | 'sort_order'> {
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
  const giverIds = [...new Set([
    ...(Array.isArray(m.giver_ids) ? m.giver_ids.map(num) : []),
    num(m.giver_id),
  ].filter((x): x is number => x !== null))]
  return {
    status: oneOf(QUEST_STATUSES, m.status, 'rumor'),
    giver_id: giverIds[0] ?? null,
    giver_ids: giverIds,
    giver_hidden: !!m.giver_hidden,
    importance: (QUEST_IMPORTANCE as readonly unknown[]).includes(m.importance) ? m.importance as QuestImportance : null,
    optional: typeof m.optional === 'boolean' ? m.optional : null,
    questline_id: num(m.questline_id),
    questline_order: Number(m.questline_order) || 0,
    storyline_id: num(m.storyline_id),
    reward: typeof m.reward === 'string' && m.reward.trim() ? m.reward : null,
    objectives,
    sort_order: Number(m.sort_order) || 0,
  }
}

/** A quest's importance: its own, else its questline's (major when neither says). */
export function effectiveImportance(q: Pick<Quest, 'importance'>, line: Pick<Questline, 'importance'> | null | undefined): QuestImportance {
  return q.importance ?? line?.importance ?? 'major'
}

/** Whether a quest is optional: its own setting, else its questline's. */
export function effectiveOptional(q: Pick<Quest, 'optional'>, line: Pick<Questline, 'optional'> | null | undefined): boolean {
  return q.optional ?? line?.optional ?? false
}

// ---------------------------------------------------------------------------
// Story map: quests, clusters and beats placed freely, joined by arrows
// ---------------------------------------------------------------------------

export const MAP_NODE_KINDS = ['quest', 'cluster', 'beat'] as const
export type MapNodeKind = typeof MAP_NODE_KINDS[number]

export interface StoryMapNode {
  id: number
  kind: MapNodeKind
  ref_id: number
  x: number
  y: number
  /** 1-based act number, null = no act yet */
  act: number | null
}

/** leads = solid arrow "opens up"; related = dotted line "connected, any order" */
export const MAP_EDGE_KINDS = ['leads', 'related'] as const
export type MapEdgeKind = typeof MAP_EDGE_KINDS[number]

/** A line between two cards, optionally with a condition ("if they break in") */
export interface StoryMapEdge {
  id: number
  from_node: number
  to_node: number
  label: string | null
  kind: MapEdgeKind
}

export interface StoryMap {
  nodes: StoryMapNode[]
  edges: StoryMapEdge[]
}

/** A beat is armed when it's still open and the party is at (or near) its trigger place. */
export function isArmed(beat: Pick<StoryBeat, 'status' | 'trigger_location_id'>, nearby: Set<number>): boolean {
  return !!beat.trigger_location_id && (beat.status === 'idea' || beat.status === 'ready') && nearby.has(beat.trigger_location_id)
}
