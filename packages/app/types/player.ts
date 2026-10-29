import type { GroupInfo } from './group'

// Player-to-Entity relation types (what a player knows/has discovered)
export const PLAYER_RELATION_TYPES = [
  'knows',
  'discovered',
  'created',
  'owns',
  'visited',
  'interested',
  'allied',
  'hostile',
  'met',
  'heard_of',
  'researched',
  'forgotten',
  'believesIn',
  'worships',
  'friend',
  'rival',
  'contact',
  'informant',
  'nemesis',
  'betrayer',
  'protector',
  'ward',
  'mentor',
  'student',
  'employer',
  'employee',
  'master',
  'servant',
  'family',
  'spouse',
  'parent',
  'child',
  'sibling',
  'lover',
] as const

export type PlayerRelationType = (typeof PLAYER_RELATION_TYPES)[number]

export interface PlayerMetadata {
  player_name?: string | null // Real name of the player (Spielername)
  inspiration?: number // DM inspiration counter
  email?: string | null
  phone?: string | null
  discord?: string | null
  notes?: string | null
  birthday?: { year: number, month: number, day: number } | null // Character birthday in game calendar
  showBirthdayInCalendar?: boolean // Whether to show birthday in calendar overview
  [key: string]: unknown
}

export interface PlayerCounts {
  characters: number // NPCs controlled by this player
  items: number
  locations: number
  factions: number
  lore: number
  sessions: number
  documents: number
  images: number
  hasStats?: boolean
  groups?: GroupInfo[]
}

export interface Player {
  id: number
  name: string
  description: string | null
  image_url?: string | null
  location_id?: number | null
  metadata: PlayerMetadata | null
  created_at: string
  updated_at: string
  archived_at?: string | null
  _counts?: PlayerCounts
}

// ============================================================================
// Character details (race, classes, stats …) kept as plain metadata keys so the
// AI connector can set them one by one.
// ============================================================================

export interface PlayerClassEntry {
  name: string
  level: number | null
  subclass?: string | null
}

export interface PlayerCharacterInfo {
  race: string
  classes: PlayerClassEntry[]
  background: string
  alignment: string
  age: string
  height: string
  weight: string
  patron: string
  homeland: string
  phobia: string
  ac: number | null
  hp: number | null
  speed: string
  initiative: string
  proficiency: string
  passive_perception: number | null
}

export const PLAYER_CHARACTER_TEXT_KEYS = [
  'race', 'background', 'alignment', 'age', 'height', 'weight', 'patron', 'homeland', 'phobia', 'speed', 'initiative', 'proficiency',
] as const
export const PLAYER_CHARACTER_NUMBER_KEYS = ['ac', 'hp', 'passive_perception'] as const

export const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil', 'Unaligned',
] as const

function asText(v: unknown): string {
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return ''
}
function asNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function emptyCharacterInfo(): PlayerCharacterInfo {
  return {
    race: '', classes: [], background: '', alignment: '', age: '', height: '', weight: '',
    patron: '', homeland: '', phobia: '', ac: null, hp: null, speed: '', initiative: '', proficiency: '', passive_perception: null,
  }
}

/** Character details from player metadata (anything missing comes back empty). */
export function readCharacterInfo(metadata: Record<string, unknown> | null | undefined): PlayerCharacterInfo {
  const m = metadata ?? {}
  const info = emptyCharacterInfo()
  for (const key of PLAYER_CHARACTER_TEXT_KEYS) info[key] = asText(m[key])
  for (const key of PLAYER_CHARACTER_NUMBER_KEYS) info[key] = asNumber(m[key])
  const classes = Array.isArray(m.classes) ? m.classes : []
  info.classes = classes
    .map((c) => {
      const row = (c && typeof c === 'object' ? c : { name: c }) as Record<string, unknown>
      return { name: asText(row.name), level: asNumber(row.level), subclass: asText(row.subclass) || null }
    })
    .filter(c => c.name)
  // Older/seeded players keep a single "class" (+ "level") instead of a list
  if (!info.classes.length && typeof m.class === 'string' && m.class.trim()) {
    info.classes = [{ name: m.class.trim(), level: asNumber(m.level), subclass: null }]
  }
  return info
}

/** Metadata keys to save for the character details (empty values become null). */
export function characterInfoToMetadata(info: PlayerCharacterInfo): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of PLAYER_CHARACTER_TEXT_KEYS) out[key] = info[key].trim() || null
  for (const key of PLAYER_CHARACTER_NUMBER_KEYS) out[key] = info[key] ?? null
  const classes = info.classes
    .filter(c => c.name.trim())
    .map(c => ({ name: c.name.trim(), level: c.level ?? null, subclass: c.subclass?.trim() || null }))
  out.classes = classes.length ? classes : null
  return out
}

/** "Pirate 3 / Warlock 1" */
export function classLine(info: Pick<PlayerCharacterInfo, 'classes'>): string {
  return info.classes.map(c => (c.level ? `${c.name} ${c.level}` : c.name)).join(' / ')
}

/** Sum of class levels (null when no class has a level). */
export function totalLevel(info: Pick<PlayerCharacterInfo, 'classes'>): number | null {
  const levels = info.classes.map(c => c.level).filter((l): l is number => typeof l === 'number')
  return levels.length ? levels.reduce((a, b) => a + b, 0) : null
}

export function hasCharacterInfo(info: PlayerCharacterInfo): boolean {
  return PLAYER_CHARACTER_TEXT_KEYS.some(k => info[k]) || PLAYER_CHARACTER_NUMBER_KEYS.some(k => info[k] !== null) || info.classes.length > 0
}
