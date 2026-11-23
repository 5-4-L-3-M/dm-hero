/**
 * Naval play (Korvalia "Naval Combat and Nautical Roles" supplement):
 * ship roles a character holds on top of their class, ship presets,
 * ship-mounted weapons, and the round-by-round movement rules.
 * Pure data + functions so the UI, the API and the tests share them.
 */

// ---------------------------------------------------------------------------
// Ship roles (stored on players/NPCs as metadata.ship_role + ship_role_rank)
// ---------------------------------------------------------------------------

export const SHIP_ROLES = ['captain', 'first_mate', 'master_bosun', 'purser', 'cook', 'master_at_arms', 'quartermaster', 'bannerman'] as const
export type ShipRole = typeof SHIP_ROLES[number]
export type ShipRank = 1 | 2 | 3

export const SHIP_ROLE_ICONS: Record<ShipRole, string> = {
  captain: 'mdi-ship-wheel',
  first_mate: 'mdi-account-tie-hat',
  master_bosun: 'mdi-hammer-wrench',
  purser: 'mdi-sack',
  cook: 'mdi-pot-steam',
  master_at_arms: 'mdi-sword-cross',
  quartermaster: 'mdi-compass-rose',
  bannerman: 'mdi-flag-variant',
}

/** Features unlocked per ship rank (English rules text, shown in the role field and the DM Screen) */
export const SHIP_ROLE_FEATURES: Record<ShipRole, { duty: string, ranks: [string, string, string] }> = {
  captain: {
    duty: 'Leader of the ship, master helmsman and tactician. Proficiency with water vehicles; add proficiency to checks about the nature of the sea.',
    ranks: [
      'Tie-Breaker (breaks crew votes, settles disputes). Supreme Tactician: 12 tactician points per rank per long rest at the wheel — Top Speed (1), Seajog Feint (2), Advantageous Impact (5).',
      'Arcane Tactics: Ship-Shield (7 pts), Rising Tide (10 pts).',
      'Nimble Captain (double proficiency on Maneuver checks). Supreme Arcane Enchantment (Submersible, Airship, Invisibility or Blink Ship). Bosun\'s Market I if no master bosun.',
    ],
  },
  first_mate: {
    duty: 'Seaman of all trades. Proficiency with water vehicles and bosun\'s tools; shape water + mending. Proficiency and advantage on checks to read crew morale.',
    ranks: [
      'Deck-Speed (+10 ft on the ship, climb = speed). First Mate, Second Best (add half proficiency to unproficient checks on board).',
      'Water-Borne (create or destroy water, fog cloud, gust of wind, water walk, water breathing — 1/long rest each). Captain\'s Right Hand (one captain tactic per short rest at the wheel).',
      'Rope of Climbing. Ship-Shape (disguise ship 1/long rest).',
    ],
  },
  master_bosun: {
    duty: 'Repairs and ship\'s equipment. Proficiency with bosun\'s tools; mending + shape water. Add proficiency to checks about mechanical contraptions.',
    ranks: [
      'Hammer Home (Bosun\'s Guild Market). Fix-it Fast (Master Bosun repair table). Hit \'em Where it Hurts (ship-mounted weapon proficiency, add proficiency to ship weapon damage).',
      'Even Fixier (double proficiency on repairs and Hit \'em damage).',
      'Shiptastic (free upgrade: +2 AC, +1 Agility, +2 weapon ports or +250 hull). The Fixiest (triple proficiency).',
    ],
  },
  purser: {
    duty: 'Finances and inventory. Add proficiency to barter checks. Starts with ledger, abacus and 2,000 gp for the ship\'s budget.',
    ranks: [
      'Living Loot Satchel (bag of holding tied to hold and vault; move funds as an action). Buyer\'s Market (hire crews, sell at market value, contraband contacts).',
      'Get a Hold (bonus action: pull an item from the hold). Where\'d You Get That? (DC 15 Sleight of Hand: adventuring gear ≤ 15 gp, 5 tries/long rest).',
      'Investment Options (advantage to win investors, auto-succeed 1 Insight/long rest). Magic Folio (forge any document, 24 h, 1/long rest).',
    ],
  },
  cook: {
    duty: 'Feed and fortify the crew. Proficiency with cooking utensils; galley cold storage. Add proficiency to identify ingredients.',
    ranks: [
      'Arcane Mealtime (1 meal/long rest at sea): Fortifying (2d4+2 temp HP), Bolstering (adv. STR saves), Nimble (adv. DEX saves), Protective (resist one damage type), Strong-willed (adv. vs charm/illusion), Brave (adv. vs frightened) — 24 h.',
      'Homebrew Kit (brewer\'s supplies, a cask every ten-day, 1 limited-edition flask: roll d10).',
      'Spectral Staffing (action, 1/long rest): Maître d\', Sommelier, Sous Chef or Busboy Team.',
    ],
  },
  master_at_arms: {
    duty: 'Sword and shield of the ship. Gains one simple or martial weapon. Add proficiency to Insight to sense ill intent toward the crew.',
    ranks: [
      'Bring a Gun to a Gunfight (ship-mounted weapon proficiency). Fearless Boarding (bonus action, 1/long rest: 1d12 temp HP per rank when boarding). Sure-Footed (auto-succeed Brace checks).',
      'Rally Cry (crew on deck get advantage on next attack; uses = ship rank per long rest). Quite a Feat (one martial feat).',
      'Crew Wrangler (reaction: throw a rope to a crew member who falls overboard).',
    ],
  },
  quartermaster: {
    duty: 'Navigator and lookout. Add proficiency to sense weather or currents. Starts with maps, compass, sextant, spyglass.',
    ranks: [
      'Eye on the Horizon (advantage on Perception/Survival about position, weather, water, outside threats). Wind for the Sails (gust of wind into the sails 2× rank per long rest: advantage on the helm\'s Maneuver check).',
      'Eye in the Sky (arcane eye 1/long rest). Talk to the Map (Sentient Map of Naval Guidance).',
      'Eye of the Storm (call lightning, clairvoyance, control weather 1/long rest each). Master of the Map (10 mi range, 3 questions, ship scans).',
    ],
  },
  bannerman: {
    duty: 'Communications and public relations. Message + thaumaturgy. Add proficiency to boost the ship\'s reputation. Flags, disguise kit, sending stones.',
    ranks: [
      'Arcane Communicator (proficiency and advantage on Insight vs an approaching ship; captain has advantage on Charisma checks in negotiations; tongues = rank per long rest).',
      'Call the Hawks (five messenger hawks, 200 mi/day). Finer Points (illusory script, skywrite, ship mirroring 1/long rest).',
      'War Drum (DC 17 CHA save or enemy helmsmen flee, 2×/long rest). Mirror, Mirror (ship mirroring 2×/long rest).',
    ],
  },
}

export function readShipRole(v: unknown): ShipRole | null {
  return (SHIP_ROLES as readonly unknown[]).includes(v) ? v as ShipRole : null
}
export function readShipRank(v: unknown): ShipRank {
  const n = Number(v)
  return n === 2 || n === 3 ? n : 1
}
export const RANK_LABELS = ['I', 'II', 'III'] as const

// ---------------------------------------------------------------------------
// Ships
// ---------------------------------------------------------------------------

export interface ShipPreset {
  key: string
  name: string
  masts: number
  agility: number
  mph: number
  dailyMiles: number
  combatSpeed: number
  size: number
  hull: number
  ac: number
  broadside: number
  bow: number
  mid: number
  stern: number
}

/** [name, masts, agility, mph, mi/day, ft/round, size, hull, AC, broadside ports, bow, mid, stern] */
const PRESET_ROWS: [string, ...number[]][] = [
  ['Skuttle', 1, 4, 8, 200, 70, 1, 250, 14, 2, 0, 0, 1],
  ['Skirmisher', 1, 3, 4, 100, 35, 1, 400, 16, 4, 1, 0, 1],
  ['Sprinter', 1, 5, 9, 225, 80, 1, 200, 12, 1, 0, 0, 1],
  ['Buccaneer', 2, 4, 7, 175, 60, 2, 400, 15, 3, 1, 0, 1],
  ['Striker', 1, 4, 8, 200, 70, 2, 400, 14, 2, 2, 0, 2],
  ['Hauler', 2, 3, 8, 200, 70, 2, 400, 15, 2, 1, 0, 1],
  ['Tactician', 2, 3, 6, 150, 50, 2, 500, 15, 4, 1, 1, 1],
  ['Trader', 2, 2, 7, 175, 60, 3, 600, 15, 3, 2, 1, 2],
  ['Bull', 4, 1, 4, 100, 35, 3, 800, 16, 5, 1, 0, 2],
  ['Prowler', 2, 3, 7, 175, 60, 3, 400, 13, 2, 3, 2, 3],
  ['Admiral Class', 4, 1, 5, 125, 45, 4, 750, 15, 5, 3, 2, 2],
  ['Bombardier', 4, 0, 2, 50, 20, 4, 1000, 16, 6, 4, 6, 4],
  ['Cloudbuster', 4, 2, 5, 125, 35, 4, 800, 13, 4, 5, 3, 5],
  ['Rowboat', 0, 0, 3, 75, 25, 0, 24, 10, 0, 0, 0, 0],
  ['Launch', 0, 0, 5, 125, 35, 0, 48, 10, 0, 0, 0, 0],
]
export const SHIP_PRESETS: ShipPreset[] = PRESET_ROWS.map(([name, masts, agility, mph, dailyMiles, combatSpeed, size, hull, ac, broadside, bow, mid, stern]) => ({
  key: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  masts: masts!,
  agility: agility!,
  mph: mph!,
  dailyMiles: dailyMiles!,
  combatSpeed: combatSpeed!,
  size: size!,
  hull: hull!,
  ac: ac!,
  broadside: broadside!,
  bow: bow!,
  mid: mid!,
  stern: stern!,
}))

export const PART_MAX = { mast: 100, wheel: 50, rudder: 100 } as const

export type WeaponMount = 'port' | 'starboard' | 'bow' | 'mid' | 'stern' | 'hull'
/** 0 = empty, 1 = loaded, 2 = aimed (ready to fire) */
export type WeaponState = 0 | 1 | 2

export interface ShipWeapon {
  id: string
  name: string
  mount: WeaponMount
  count: number
  toHit: string
  damage: string
  notes?: string
  state: WeaponState
}

export interface WeaponPreset { name: string, mount: WeaponMount, toHit: string, damage: string, notes?: string }
export const WEAPON_PRESETS: WeaponPreset[] = [
  { name: 'Light Cannon', mount: 'port', toHit: '+6', damage: '6d10 bludgeoning', notes: '300/600 ft, hull only' },
  { name: 'Cannon', mount: 'port', toHit: '+6', damage: '8d10 bludgeoning', notes: '300/600 ft, hull only' },
  { name: 'Imperial Cannon', mount: 'port', toHit: '+6', damage: '10d10 bludgeoning', notes: '300/600 ft, hull only (MB III)' },
  { name: 'Ballista', mount: 'bow', toHit: '+6', damage: '3d10 piercing', notes: '150/300 ft' },
  { name: 'Harpoon Rifle', mount: 'bow', toHit: '+6', damage: '2d12 piercing', notes: 'grapples Large or smaller, DC 16 to break free' },
  { name: 'Mast Cannon (chain shot)', mount: 'mid', toHit: '+6', damage: '6d12 slashing', notes: 'masts/rigging or creatures, no hull damage (MB I)' },
  { name: 'Fire Spray', mount: 'bow', toHit: 'DC 15 DEX', damage: '6d12 fire', notes: '15 ft line, 20 shots, starts a moderate fire (MB II)' },
  { name: 'Iron Graspers', mount: 'mid', toHit: '+6', damage: '—', notes: 'grapples a mast; neither ship can flee; DC 20 STR (MB III)' },
  { name: 'Lightning Cannon', mount: 'bow', toHit: 'DC 18 DEX', damage: '8d8 lightning', notes: '30 ft line, stunned, 5/day (MB II)' },
  { name: 'Heavy Net Cannon', mount: 'bow', toHit: '+6', damage: '—', notes: '50/100 ft, restrained, DC 15 STR (MB I)' },
  { name: 'Mortar', mount: 'mid', toHit: '+INT', damage: '10d12 piercing', notes: '150/300 ft, INT 13+ (MB I)' },
  { name: 'The Hammer', mount: 'mid', toHit: '+INT', damage: '16d12 piercing', notes: '150/300 ft, INT 13+ (MB III)' },
  { name: 'Meteor Cannon', mount: 'mid', toHit: '+INT', damage: '20d6 piercing + 20d6 fire', notes: 'starts a major fire, INT 13+ (MB III)' },
  { name: 'Spiked Hull', mount: 'hull', toHit: 'on ram', damage: '4d12 piercing', notes: 'added to a successful ram (MB I)' },
  { name: 'Flaming Ram', mount: 'hull', toHit: 'on ram', damage: '6d6 fire', notes: 'added to a successful ram, starts a moderate fire (MB I)' },
  { name: 'Sea Mine', mount: 'stern', toHit: 'DC 15 Maneuver', damage: '20d10 force', notes: 'dropped behind; DC 15 Perception to spot (MB II)' },
]

export type FireSize = 'minor' | 'moderate' | 'major'
export const FIRE_TABLE: Record<FireSize, { dice: string, rounds: number }> = {
  minor: { dice: '2d6', rounds: 2 },
  moderate: { dice: '4d6', rounds: 4 },
  major: { dice: '6d6', rounds: 6 },
}
export interface ShipFire { id: string, size: FireSize, roundsLeft: number | null }

export interface ShipRepair { id: string, label: string, roundsLeft: number | null, note: string }

export interface ShipData {
  preset?: string
  size: number
  agility: number
  ac: number
  speed: number
  hull: number
  hullMax: number
  masts: number[]
  wheel: number
  rudder: number
  helmsman: string
  helmBonus: number
  deckhands: boolean
  weapons: ShipWeapon[]
  fires: ShipFire[]
  repairs: ShipRepair[]
  notes: string
}

export type ShipSide = 'ally' | 'enemy'
export interface EncounterShip {
  id: number
  encounter_id: number
  side: ShipSide
  name: string
  sort_order: number
  data: ShipData
}

export function newId() {
  return Math.random().toString(36).slice(2, 10)
}

export function shipFromPreset(p: ShipPreset): ShipData {
  return {
    preset: p.key,
    size: p.size,
    agility: p.agility,
    ac: p.ac,
    speed: p.combatSpeed,
    hull: p.hull,
    hullMax: p.hull,
    masts: Array.from({ length: p.masts }, () => PART_MAX.mast),
    wheel: PART_MAX.wheel,
    rudder: PART_MAX.rudder,
    helmsman: '',
    helmBonus: 0,
    deckhands: true,
    weapons: [],
    fires: [],
    repairs: [],
    notes: '',
  }
}

/** Fill in anything missing (old rows, hand-made ships) so the UI can rely on the shape */
export function normalizeShip(d: Partial<ShipData> | null | undefined): ShipData {
  const base = shipFromPreset(SHIP_PRESETS[3]!)
  const out = { ...base, preset: undefined, ...(d ?? {}) } as ShipData
  out.masts = Array.isArray(out.masts) ? out.masts.map(n => clampNum(n, 0, PART_MAX.mast)) : []
  out.weapons = Array.isArray(out.weapons) ? out.weapons : []
  out.fires = Array.isArray(out.fires) ? out.fires : []
  out.repairs = Array.isArray(out.repairs) ? out.repairs : []
  return out
}

function clampNum(v: unknown, min: number, max: number) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : max
}

export interface ShipCondition {
  disabled: boolean
  halfMast: boolean
  sinking: boolean
  speed: number
  reasons: string[]
}

/** Masts at 0, half the masts down, wheel/rudder gone → speed and maneuver penalties */
export function shipCondition(d: ShipData): ShipCondition {
  const reasons: string[] = []
  const total = d.masts.length
  const working = d.masts.filter(h => h > 0).length
  const allMastsDown = total > 0 && working === 0
  const halfMast = total > 0 && !allMastsDown && working <= total / 2
  if (allMastsDown) reasons.push('masts')
  if (d.wheel <= 0) reasons.push('wheel')
  if (d.rudder <= 0) reasons.push('rudder')
  const disabled = reasons.length > 0
  return {
    disabled,
    halfMast,
    sinking: d.hull <= 0,
    speed: disabled ? 0 : halfMast ? Math.floor(d.speed / 2) : d.speed,
    reasons,
  }
}

export function maneuverBonus(d: ShipData) {
  return d.agility + (Number(d.helmBonus) || 0)
}

// ---------------------------------------------------------------------------
// Movement (ram / flank / withdraw)
// ---------------------------------------------------------------------------

export const MOVES = ['ram', 'flank', 'withdraw'] as const
export type Move = typeof MOVES[number] | 'none'

/** Ram damage and Brace DC by rammer size − target size */
export function ramTable(sizeDiff: number) {
  if (sizeDiff >= 3) return { dice: '10d12', braceDc: 18 }
  if (sizeDiff === 2) return { dice: '8d12', braceDc: 16 }
  if (sizeDiff === 1) return { dice: '6d12', braceDc: 14 }
  return { dice: '4d12', braceDc: 12 }
}

export interface SideOutcome {
  /** advantage / disadvantage on ship-mounted weapons this round */
  weapons: 'advantage' | 'disadvantage' | 'normal'
  /** this side's broadsides automatically miss */
  broadsidesMiss: boolean
  /** only these mounts can target the other ship (null = no limit) */
  onlyMounts: WeaponMount[] | null
  /** rammed: take ram damage (dice) and make a Brace check */
  takesRam: { dice: string, braceDc: number } | null
  /** has a perfect flank */
  perfectFlank: boolean
  /** may choose to flee or fire */
  mayFlee: boolean
}

export interface RoundOutcome {
  kind: 'ram-ram' | 'ram-withdraw' | 'ram-flank' | 'withdraw-withdraw' | 'withdraw-flank' | 'flank-flank' | 'disabled'
  a: SideOutcome
  b: SideOutcome
  boarding: boolean
  contest: boolean
  summary: string
}

const neutral = (): SideOutcome => ({ weapons: 'normal', broadsidesMiss: false, onlyMounts: null, takesRam: null, perfectFlank: false, mayFlee: false })

/**
 * Resolve one round of ship movement. a/b are each ship's secret move and size.
 * A move of 'none' means the ship is disabled or its helm is unmanned.
 */
export function resolveMoves(a: { move: Move, size: number }, b: { move: Move, size: number }): RoundOutcome {
  const A = neutral()
  const B = neutral()
  if (a.move === 'none' || b.move === 'none') {
    const free = a.move === 'none' ? B : A
    free.mayFlee = true
    return { kind: 'disabled', a: A, b: B, boarding: false, contest: false, summary: 'A ship can\'t maneuver: the other may ram, perfectly flank bow or stern, or flee.' }
  }
  // put the pair in a fixed order so each matchup is written once
  const order = ['ram', 'withdraw', 'flank'] as const
  const swap = order.indexOf(a.move) > order.indexOf(b.move)
  const [x, y] = swap ? [b, a] : [a, b]
  const [X, Y] = swap ? [B, A] : [A, B]
  let kind: RoundOutcome['kind']
  let boarding = false
  let contest = false
  let summary: string
  if (x.move === 'ram' && y.move === 'ram') {
    kind = 'ram-ram'
    X.takesRam = ramTable(y.size - x.size)
    Y.takesRam = ramTable(x.size - y.size)
    X.weapons = Y.weapons = 'disadvantage'
    boarding = true
    summary = 'Both ram: each takes ram damage, both Brace, both have disadvantage on ship weapons. Boarding is possible.'
  }
  else if (x.move === 'ram' && y.move === 'withdraw') {
    kind = 'ram-withdraw'
    Y.perfectFlank = true
    Y.weapons = 'advantage'
    Y.mayFlee = true
    X.broadsidesMiss = true
    X.onlyMounts = ['stern']
    summary = 'The ram misses. The withdrawing ship perfectly flanks the rammer\'s stern (advantage) and chooses to flee or fire. The rammer can only answer with stern weapons.'
  }
  else if (x.move === 'ram' && y.move === 'flank') {
    kind = 'ram-flank'
    Y.takesRam = ramTable(x.size - y.size)
    Y.weapons = 'disadvantage'
    X.weapons = 'advantage'
    boarding = true
    summary = 'The flanker sails into the ram: it takes ram damage, Braces and has disadvantage. The rammer has advantage. Boarding is possible.'
  }
  else if (x.move === 'withdraw' && y.move === 'withdraw') {
    kind = 'withdraw-withdraw'
    summary = 'Both withdraw: neutral position, no advantage, no one can safely flee.'
  }
  else if (x.move === 'withdraw' && y.move === 'flank') {
    kind = 'withdraw-flank'
    Y.perfectFlank = true
    Y.weapons = 'advantage'
    X.broadsidesMiss = true
    X.onlyMounts = ['bow']
    summary = 'The flanker perfectly flanks the withdrawing ship\'s bow (advantage). The withdrawing ship\'s broadsides miss; only its bow weapons can fire.'
  }
  else {
    kind = 'flank-flank'
    contest = true
    summary = 'Both flank: competing Maneuver checks. The winner has advantage on broadsides, the loser disadvantage.'
  }
  return { kind, a: A, b: B, boarding, contest, summary }
}

// ---------------------------------------------------------------------------
// Repairs
// ---------------------------------------------------------------------------

/** [min total, standard major, standard minor, master major, master minor] — times in seconds, -1 = "you make it worse", 0 = repaired */
const REPAIR_ROWS: [number, number, number, number, number][] = [
  [-Infinity, -1, 8 * 3600, -1, 3600],
  [1, 12 * 3600, 4 * 3600, 2 * 3600, 1800],
  [2, 8 * 3600, 3 * 3600, 3600, 600],
  [3, 4 * 3600, 2 * 3600, 1800, 300],
  [4, 3 * 3600, 3600, 600, 120],
  [5, 2 * 3600, 1800, 300, 60],
  [10, 3600, 600, 120, 30],
  [15, 600, 300, 60, 18],
  [20, 300, 120, 30, 0],
  [25, 120, 60, 18, 0],
  [30, 0, 30, 0, 0],
]

/** Time a repair takes for a repair-check total. seconds: -1 = made it worse (a full day or new parts), 0 = done now */
export function repairTime(total: number, major: boolean, masterBosun: boolean): { seconds: number, rounds: number | null } {
  let row = REPAIR_ROWS[0]!
  for (const r of REPAIR_ROWS) if (total >= r[0]) row = r
  const seconds = masterBosun ? (major ? row[3] : row[4]) : (major ? row[1] : row[2])
  return { seconds, rounds: seconds >= 0 && seconds <= 60 ? Math.ceil(seconds / 6) : null }
}

export function formatDuration(seconds: number) {
  if (seconds < 0) return 'Worse — a full day or new parts'
  if (seconds === 0) return 'Repaired!'
  if (seconds < 60) return `${seconds} sec (${Math.ceil(seconds / 6)} rounds)`
  if (seconds === 60) return '1 min (10 rounds)'
  if (seconds < 3600) return `${seconds / 60} min`
  return `${seconds / 3600} h`
}

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

/** Roll every "NdM" in a string and add flat "+N" bonuses: "8d12", "20d6 + 20d6", "1d4+3" */
export function rollDice(expr: string, rand: () => number = Math.random): { total: number, detail: string } {
  let total = 0
  const parts: string[] = []
  const re = /(\d*)d(\d+)|([+-]\s*\d+)(?!\d|\s*d)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(expr))) {
    if (m[2]) {
      const n = Number(m[1] || 1)
      const sides = Number(m[2])
      let sum = 0
      for (let i = 0; i < n; i++) sum += 1 + Math.floor(rand() * sides)
      total += sum
      parts.push(`${n}d${sides}=${sum}`)
    }
    else if (m[3]) {
      const flat = Number(m[3].replace(/\s/g, ''))
      total += flat
      parts.push(String(flat))
    }
  }
  return { total, detail: parts.join(' + ') }
}

export function rollD20(mode: 'normal' | 'advantage' | 'disadvantage' = 'normal', rand: () => number = Math.random) {
  const r1 = 1 + Math.floor(rand() * 20)
  if (mode === 'normal') return r1
  const r2 = 1 + Math.floor(rand() * 20)
  return mode === 'advantage' ? Math.max(r1, r2) : Math.min(r1, r2)
}
