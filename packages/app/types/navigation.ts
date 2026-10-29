// The sidebar order the DM can arrange: nav entries by key, plus dividers
// ("divider:<id>"). The dashboard always stays on top and isn't part of it.

export const NAV_KEYS = [
  'search', 'story', 'quests', 'npcs', 'locations', 'items', 'factions', 'lore', 'players', 'sessions',
  'gameTable', 'encounters', 'calendar', 'maps', 'music', 'groups', 'notes',
] as const
export type NavKey = typeof NAV_KEYS[number]

/** Entries added after the first release → the entry they sit below by default. */
const NAV_ANCHORS: Partial<Record<NavKey, NavKey>> = { story: 'search', quests: 'story' }

/** A nav entry key or a divider ("divider:<id>") */
export type NavLayoutEntry = NavKey | `divider:${string}`

export const MAX_NAV_DIVIDERS = 20

export const isNavDivider = (entry: string): entry is `divider:${string}` => /^divider:[\w-]{1,40}$/.test(entry)

/**
 * A saved layout made safe: unknown/duplicate entries go, too many dividers go,
 * entries missing from it are added (new ones below their anchor) - nothing can get lost.
 */
export function normalizeNavLayout(value: unknown): NavLayoutEntry[] {
  const seen = new Set<string>()
  const result: NavLayoutEntry[] = []
  let dividers = 0
  for (const entry of Array.isArray(value) ? value : []) {
    if (typeof entry !== 'string' || seen.has(entry)) continue
    if (isNavDivider(entry)) {
      if (dividers >= MAX_NAV_DIVIDERS) continue
      dividers++
    }
    else if (!(NAV_KEYS as readonly string[]).includes(entry)) continue
    seen.add(entry)
    result.push(entry as NavLayoutEntry)
  }
  for (const key of NAV_KEYS) {
    if (seen.has(key)) continue
    // Entries added in a later version slot in after their anchor (so the
    // Story Board lands near the top of an existing layout); others go last
    const anchor = NAV_ANCHORS[key]
    const at = anchor && seen.has(anchor) ? result.indexOf(anchor) + 1 : result.length
    result.splice(at, 0, key)
    seen.add(key)
  }
  return result
}
