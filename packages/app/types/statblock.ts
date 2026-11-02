// One stat block shape for monsters and NPCs (5e style), easy to read and roll from.

export interface StatFeature {
  name: string
  text: string
}

export interface StatBlock {
  size?: string | null
  /** "humanoid (any race)", "dragon" … */
  kind?: string | null
  alignment?: string | null
  ac?: number | null
  ac_note?: string | null
  hp?: number | null
  /** "2d8+2" */
  hp_formula?: string | null
  speed?: string | null
  str?: number | null
  dex?: number | null
  con?: number | null
  int?: number | null
  wis?: number | null
  cha?: number | null
  saves?: string | null
  skills?: string | null
  vulnerabilities?: string | null
  resistances?: string | null
  immunities?: string | null
  condition_immunities?: string | null
  senses?: string | null
  languages?: string | null
  /** "1/8", "5" */
  cr?: string | null
  xp?: number | null
  traits?: StatFeature[]
  actions?: StatFeature[]
  bonus_actions?: StatFeature[]
  reactions?: StatFeature[]
  legendary?: StatFeature[]
  /** How it fights, tactics, rules for this fight */
  notes?: string | null
}

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
export type Ability = typeof ABILITIES[number]

export function abilityMod(score: number | null | undefined): number {
  return Math.floor(((score ?? 10) - 10) / 2)
}
export function fmtMod(n: number): string {
  return n >= 0 ? `+${n}` : String(n)
}

export const FEATURE_SECTIONS = ['traits', 'actions', 'bonus_actions', 'reactions', 'legendary'] as const

/** A rollable piece of a feature: "+4 to hit" or "1d6 + 2 piercing" */
export interface RollPart {
  kind: 'hit' | 'damage' | 'dc'
  label: string
  /** dice expression to roll ("1d20+4", "1d6+2"); DCs have none */
  dice: string | null
  damageType?: string | null
}

/** Finds to-hit bonuses, damage dice and save DCs in a feature's text */
export function rollParts(text: string): RollPart[] {
  const parts: RollPart[] = []
  const hit = text.match(/([+-]\s?\d+)\s*to hit/i)
  if (hit) {
    const b = Number(hit[1]!.replace(/\s/g, ''))
    parts.push({ kind: 'hit', label: `${fmtMod(b)} to hit`, dice: `1d20${fmtMod(b)}` })
  }
  const dmg = /(\d+d\d+(?:\s*[+-−]\s*\d+)?)\s*\)?\s*([a-z]+)?\s*(?:damage)?/gi
  const seen = new Set<string>()
  for (const m of text.matchAll(dmg)) {
    const dice = m[1]!.replace(/\s/g, '').replace('−', '-')
    const type = m[2] && /^(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)$/i.test(m[2]) ? m[2].toLowerCase() : null
    const key = `${dice}${type}`
    if (seen.has(key)) continue
    seen.add(key)
    parts.push({ kind: 'damage', label: type ? `${dice} ${type}` : dice, dice, damageType: type })
  }
  const dc = text.match(/DC\s?(\d+)\s+([A-Z][a-z]+)/)
  if (dc) parts.push({ kind: 'dc', label: `DC ${dc[1]} ${dc[2]}`, dice: null })
  return parts
}

/** Number text → number or null */
const num = (v: string | undefined) => (v === undefined ? null : Number(v.replace(/[^\d-]/g, '')) || null)

/**
 * Reads a stat block written as text (an NPC's notes):
 * "AC 16 - HP 22 - Speed 30 ft", "STR 14 (+2) DEX 12 (+1) …", "**Spear:** +4 to hit, 1d6 + 2 piercing".
 * Returns the block plus the lines it used (so they can be taken out of the notes).
 */
export function parseStatText(text: string): { block: StatBlock, used: string[] } | null {
  const block: StatBlock = { traits: [], actions: [] }
  const used: string[] = []
  let found = 0
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    let hitLine = false
    const ac = line.match(/\bAC\s*:?\s*(\d+)(?:\s*\(([^)]+)\))?/i)
    const hp = line.match(/\bHP\s*:?\s*(\d+)(?:\s*\(([^)]+)\))?/i)
    const speed = line.match(/\bSpeed\s*:?\s*([\d][^-–—|;]*?ft\.?(?:[^-–—|;]*ft\.?)*)/i)
    if (ac && (hp || speed || /^\W*AC\b/i.test(line))) {
      block.ac = num(ac[1])
      if (ac[2]) block.ac_note = ac[2]
      hitLine = true
    }
    if (hp && (ac || /^\W*HP\b/i.test(line))) {
      block.hp = num(hp[1])
      if (hp[2]) block.hp_formula = hp[2].replace(/\s/g, '')
      hitLine = true
    }
    if (speed && hitLine) block.speed = speed[1]!.trim()
    const abil = [...line.matchAll(/\b(STR|DEX|CON|INT|WIS|CHA)\s*:?\s*(\d{1,2})/gi)]
    if (abil.length >= 3) {
      for (const m of abil) (block as Record<string, unknown>)[m[1]!.toLowerCase()] = Number(m[2])
      hitLine = true
    }
    const cr = line.match(/^\W*(?:CR|Challenge)\s*:?\s*([\d/]+)/i)
    if (cr) {
      block.cr = cr[1]!
      hitLine = true
    }
    const kv = line.match(/^\W*(Saving Throws|Saves|Skills|Senses|Languages|Damage Resistances|Resistances|Damage Immunities|Immunities|Condition Immunities|Vulnerabilities)\s*:?\s*\**\s*(.+)$/i)
    if (kv && !hitLine) {
      const key = kv[1]!.toLowerCase()
      const v = kv[2]!.replace(/\*+/g, '').trim()
      if (key.startsWith('sav')) block.saves = v
      else if (key === 'skills') block.skills = v
      else if (key === 'senses') block.senses = v
      else if (key === 'languages') block.languages = v
      else if (key.startsWith('condition')) block.condition_immunities = v
      else if (key.includes('immun')) block.immunities = v
      else if (key.includes('resist')) block.resistances = v
      else block.vulnerabilities = v
      hitLine = true
    }
    if (hitLine) {
      used.push(raw)
      found++
      continue
    }
    // "**Spear:** +4 to hit …" / "Spear: +4 to hit …" / "**Shield Wall.** +1 AC …"
    const feat = line.match(/^[-*•\s]*\*\*([^*]{2,60}?)[:.]?\*\*[:.]?\s*(.+)$/) ?? line.match(/^[-•\s]*([A-Z][\w' ()/-]{1,40}?):\s+(.+)$/)
    if (feat && found) {
      const f = { name: feat[1]!.trim(), text: feat[2]!.trim() }
      if (/to hit|\d+d\d+|saving throw|DC \d+/i.test(f.text)) block.actions!.push(f)
      else block.traits!.push(f)
      used.push(raw)
    }
  }
  return found ? { block, used } : null
}
