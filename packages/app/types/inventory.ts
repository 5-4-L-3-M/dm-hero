// Inventory & carrying capacity (D&D 5e rules).
//
// Weights are stored in POUNDS on `item.metadata.weight` (the unit D&D uses for
// carrying capacity). The UI converts to kg when the metric unit system is on.
// Quantity and "equipped" live on the player→item relation's notes JSON, the
// same shape NPC item relations already use: { quantity, equipped, text }.

/** Player↔item relation types that mean "this character is carrying it". */
export const CARRIED_ITEM_RELATIONS = [
  'owns',
  'carries',
  'wields',
  'wears',
  'bought',
  'borrowed',
  'found',
  'inherited',
  'stole',
  'cursed',
] as const

export function isCarriedRelation(type: string | null | undefined): boolean {
  if (!type) return true // untyped links count as carried
  return (CARRIED_ITEM_RELATIONS as readonly string[]).includes(type.toLowerCase())
}

export interface InventoryNotes {
  quantity: number
  equipped: boolean
  text: string | null
}

/** Relation notes can be JSON ({quantity, equipped, text}), plain text, or empty. */
export function parseInventoryNotes(raw: unknown): InventoryNotes {
  let value: unknown = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    }
    catch {
      return { quantity: 1, equipped: false, text: value as string }
    }
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    const q = Number(o.quantity)
    return {
      quantity: Number.isFinite(q) && q > 0 ? q : 1,
      equipped: o.equipped === true,
      text: typeof o.text === 'string' && o.text.trim() ? o.text : null,
    }
  }
  if (typeof value === 'string') return { quantity: 1, equipped: false, text: value }
  return { quantity: 1, equipped: false, text: null }
}

export function serializeInventoryNotes(notes: InventoryNotes): string {
  const out: Record<string, unknown> = { quantity: notes.quantity, equipped: notes.equipped }
  if (notes.text) out.text = notes.text
  return JSON.stringify(out)
}

/** Reads a numeric item weight (lb) from item metadata; null when unset. */
export function readItemWeight(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') return null
  const raw = (metadata as Record<string, unknown>).weight
  if (raw === null || raw === undefined || raw === '') return null
  const w = Number(raw)
  return Number.isFinite(w) && w >= 0 ? w : null
}

/** Strength score from a stat block's values (D&D 5e preset uses `str`). */
export function readStrength(values: unknown): number | null {
  if (!values || typeof values !== 'object') return null
  const v = values as Record<string, unknown>
  for (const key of ['str', 'strength', 'STR', 'Strength']) {
    const raw = v[key]
    if (raw === undefined || raw === null || raw === '') continue
    const n = typeof raw === 'object' ? Number((raw as Record<string, unknown>).value) : Number(raw)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

export interface CarryThresholds {
  /** Above this: encumbered (speed −10 ft). STR × 5 */
  encumbered: number
  /** Above this: heavily encumbered (speed −20 ft, disadvantage). STR × 10 */
  heavy: number
  /** Maximum carrying capacity. STR × 15 + bonus */
  capacity: number
  /** Extra capacity in lb from the player's carry_bonus (can be negative, 0 when unset) */
  bonus: number
}

/** Per-player carrying capacity bonus (lb) from player metadata `carry_bonus`; 0 when unset. */
export function readCarryBonus(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object') return 0
  const raw = (metadata as Record<string, unknown>).carry_bonus
  if (raw === null || raw === undefined || raw === '') return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

/**
 * Carry thresholds from Strength. The bonus only raises (or lowers) the
 * maximum capacity; the encumbered/heavy lines stay at STR × 5 / STR × 10.
 */
export function carryThresholds(strength: number | null, bonus = 0): CarryThresholds | null {
  if (!strength || strength <= 0) return null
  const b = Number.isFinite(bonus) ? bonus : 0
  return { encumbered: strength * 5, heavy: strength * 10, capacity: Math.max(0, strength * 15 + b), bonus: b }
}

export type LoadStatus = 'normal' | 'encumbered' | 'heavy' | 'over' | 'unknown'

export function loadStatus(carried: number, strength: number | null, bonus = 0): LoadStatus {
  const t = carryThresholds(strength, bonus)
  if (!t) return 'unknown'
  if (carried > t.capacity) return 'over'
  if (carried > t.heavy) return 'heavy'
  if (carried > t.encumbered) return 'encumbered'
  return 'normal'
}

export interface InventoryEntry {
  relation_id: number
  relation_type: string
  item_id: number
  name: string
  image_url: string | null
  item_type: string | null
  /** Weight of ONE item in lb, or null when not set on the item */
  weight: number | null
  quantity: number
  equipped: boolean
  text: string | null
}

export interface PlayerInventory {
  player_id: number
  strength: number | null
  thresholds: CarryThresholds | null
  /** Total carried weight in lb (items without a weight count as 0) */
  carried: number
  status: LoadStatus
  missing_weights: number
  items: InventoryEntry[]
}

export interface PartyLoadEntry {
  player_id: number
  name: string
  player_name: string | null
  image_url: string | null
  strength: number | null
  thresholds: CarryThresholds | null
  carried: number
  status: LoadStatus
  item_count: number
  missing_weights: number
}

export function totalCarried(items: Pick<InventoryEntry, 'weight' | 'quantity'>[]): number {
  const sum = items.reduce((acc, i) => acc + (i.weight ?? 0) * i.quantity, 0)
  return Math.round(sum * 100) / 100
}
