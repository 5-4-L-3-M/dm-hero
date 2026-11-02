// Reputation: how NPCs, factions and places feel about the party.
// Points are hidden — the DM logs what happened (a preset), the bar shows a word.

export type RepSubjectType = 'NPC' | 'Faction' | 'Location'
/** rep = how they feel; notoriety = how wanted the party is (places, cools down) */
export type RepKind = 'rep' | 'notoriety'

export interface RepPreset {
  key: string
  delta: number
}
/** The eight buttons; labels and examples live in i18n (reputation.presets.<key>) */
export const REP_PRESETS: RepPreset[] = [
  { key: 'small', delta: 1 },
  { key: 'help', delta: 3 },
  { key: 'big', delta: 5 },
  { key: 'life', delta: 10 },
  { key: 'rude', delta: -1 },
  { key: 'trouble', delta: -3 },
  { key: 'betrayal', delta: -5 },
  { key: 'unforgivable', delta: -10 },
]
/** Crimes raise notoriety with a place's guard */
export const NOTORIETY_PRESETS: RepPreset[] = [
  { key: 'petty', delta: 1 },
  { key: 'crime', delta: 2 },
  { key: 'serious', delta: 3 },
  { key: 'outrage', delta: 5 },
]

export interface RepTier {
  key: string
  /** lowest points for this tier (inclusive) */
  min: number
  color: string
}
export const NPC_TIERS: RepTier[] = [
  { key: 'hostile', min: -Infinity, color: 'red' },
  { key: 'unfriendly', min: -9, color: 'orange' },
  { key: 'indifferent', min: -2, color: 'grey' },
  { key: 'friendly', min: 3, color: 'light-green' },
  { key: 'allied', min: 10, color: 'green' },
]
export const GROUP_TIERS: RepTier[] = [
  { key: 'hated', min: -Infinity, color: 'red' },
  { key: 'disliked', min: -19, color: 'orange' },
  { key: 'neutral', min: -5, color: 'grey' },
  { key: 'liked', min: 6, color: 'light-green' },
  { key: 'honored', min: 20, color: 'green' },
  { key: 'revered', min: 40, color: 'teal' },
]
export const NOTORIETY_TIERS: RepTier[] = [
  { key: 'unknown', min: -Infinity, color: 'grey' },
  { key: 'noticed', min: 1, color: 'amber' },
  { key: 'suspected', min: 3, color: 'orange' },
  { key: 'wanted', min: 6, color: 'deep-orange' },
  { key: 'hunted', min: 10, color: 'red' },
]

export function tiersFor(type: RepSubjectType, kind: RepKind = 'rep'): RepTier[] {
  if (kind === 'notoriety') return NOTORIETY_TIERS
  return type === 'NPC' ? NPC_TIERS : GROUP_TIERS
}
export function tierOf(points: number, type: RepSubjectType, kind: RepKind = 'rep'): RepTier {
  const tiers = tiersFor(type, kind)
  return [...tiers].reverse().find(t => points >= t.min) ?? tiers[0]!
}
/** Bar range shown (points beyond it just fill the bar) */
export function barRange(type: RepSubjectType, kind: RepKind = 'rep'): number {
  if (kind === 'notoriety') return 12
  return type === 'NPC' ? 15 : 50
}

/** Shop prices follow how a place feels about the party (percent change) */
export const PRICE_BY_TIER: Record<string, number> = {
  hated: 50, disliked: 20, neutral: 0, liked: -10, honored: -20, revered: -30,
  hostile: 50, unfriendly: 20, indifferent: 0, friendly: -10, allied: -20,
}

export interface RepTrack {
  subject_id: number
  subject_type: RepSubjectType
  subject_name: string
  /** 0 = the whole party, else a Player entity id (a split-off sub-tracker) */
  player_id: number
  player_name: string | null
  kind: RepKind
  points: number
  tier: string
  last_change: string | null
}

export interface RepEvent {
  id: number
  subject_id: number
  subject_name: string
  player_id: number
  player_name: string | null
  kind: RepKind
  delta: number
  reason: string | null
  preset: string | null
  session_id: number | null
  session_label: string | null
  /** set when this change rippled from another one */
  source_event_id: number | null
  created_at: string
}

/** A suggested knock-on change ("Shopkeeps +2 because Rosalind +5") */
export interface RepRipple {
  subject_id: number
  subject_type: RepSubjectType
  subject_name: string
  delta: number
  why: 'faction' | 'settlement' | 'ally' | 'rival'
}

export interface Reputation {
  tracks: RepTrack[]
  /** NPCs the party has met (for the People list even before any change) */
  met: Array<{ id: number, name: string }>
}

/** Half (rounded away from zero, at least 1) — how much a ripple carries */
export function rippleShare(delta: number, divisor: number): number {
  const v = Math.round(Math.abs(delta) / divisor)
  return Math.sign(delta) * Math.max(1, v)
}
