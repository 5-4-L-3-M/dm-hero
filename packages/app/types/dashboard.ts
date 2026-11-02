// Customisable dashboards: a grid of cards the DM arranges and resizes.

export const DASHBOARD_BOARDS = ['table', 'prep'] as const
export type DashboardBoardKey = typeof DASHBOARD_BOARDS[number]

export const CARD_TYPES = [
  'search', 'party', 'sessionNpcs', 'sessionQuests', 'nextSession', 'reputation', 'map',
  'pinned', 'clocks', 'openRoles', 'scratchpad', 'recap', 'calendar',
] as const
export type CardType = typeof CARD_TYPES[number]

export const CARD_ICONS: Record<CardType, string> = {
  search: 'mdi-magnify',
  party: 'mdi-account-group',
  sessionNpcs: 'mdi-account-star',
  sessionQuests: 'mdi-script-text',
  nextSession: 'mdi-calendar-star',
  reputation: 'mdi-scale-balance',
  map: 'mdi-map',
  pinned: 'mdi-pin',
  clocks: 'mdi-clock-outline',
  openRoles: 'mdi-account-box-multiple',
  scratchpad: 'mdi-note-edit-outline',
  recap: 'mdi-book-open-page-variant',
  calendar: 'mdi-calendar',
}

/** Size a card gets when added (12-column grid, 60px rows) */
export const CARD_SIZES: Record<CardType, { w: number, h: number }> = {
  search: { w: 12, h: 1 },
  party: { w: 4, h: 5 },
  sessionNpcs: { w: 4, h: 5 },
  sessionQuests: { w: 4, h: 5 },
  nextSession: { w: 4, h: 5 },
  reputation: { w: 4, h: 5 },
  map: { w: 8, h: 7 },
  pinned: { w: 4, h: 4 },
  clocks: { w: 4, h: 6 },
  openRoles: { w: 4, h: 5 },
  scratchpad: { w: 4, h: 4 },
  recap: { w: 4, h: 4 },
  calendar: { w: 4, h: 4 },
}

export interface DashboardCard {
  i: string
  type: CardType
  x: number
  y: number
  w: number
  h: number
  /** Per-card settings (which map, scratchpad text …) */
  config?: Record<string, unknown>
}

function card(i: string, type: CardType, x: number, y: number, w?: number, h?: number): DashboardCard {
  return { i, type, x, y, w: w ?? CARD_SIZES[type].w, h: h ?? CARD_SIZES[type].h }
}

/** What each dashboard starts with (rearrange freely) */
export const DEFAULT_LAYOUTS: Record<DashboardBoardKey, DashboardCard[]> = {
  table: [
    card('search', 'search', 0, 0),
    card('party', 'party', 0, 1),
    card('npcs', 'sessionNpcs', 4, 1),
    card('quests', 'sessionQuests', 8, 1),
    card('next', 'nextSession', 0, 6),
    card('map', 'map', 4, 6),
  ],
  prep: [
    card('next', 'nextSession', 0, 0),
    card('roles', 'openRoles', 4, 0),
    card('rep', 'reputation', 8, 0),
    card('clocks', 'clocks', 0, 5),
    card('recap', 'recap', 4, 5),
    card('pinned', 'pinned', 8, 5),
    card('pad', 'scratchpad', 4, 9),
    card('calendar', 'calendar', 8, 9),
  ],
}

/** A saved layout made safe (unknown cards dropped, numbers clamped) */
export function cleanLayout(value: unknown): DashboardCard[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap((v) => {
    const c = v as Partial<DashboardCard>
    if (!c || typeof c.i !== 'string' || seen.has(c.i) || !(CARD_TYPES as readonly unknown[]).includes(c.type)) return []
    seen.add(c.i)
    const n = (x: unknown, min: number, max: number, d: number) => (Number.isFinite(Number(x)) ? Math.min(max, Math.max(min, Math.round(Number(x)))) : d)
    return [{
      i: c.i,
      type: c.type as CardType,
      x: n(c.x, 0, 11, 0),
      y: n(c.y, 0, 500, 0),
      w: n(c.w, 2, 12, 4),
      h: n(c.h, 1, 20, 4),
      ...(c.config && typeof c.config === 'object' ? { config: c.config } : {}),
    }]
  })
}
