import { RULE_ICONS, guessShopIcon } from '../../types/shopIcons'

/**
 * The game-icons.net set (CC BY 3.0, Lorc, Delapouite & contributors), kept as name → SVG body.
 * Loaded once from the server assets on first use.
 */
interface IconSet { width: number, height: number, icons: Record<string, string> }
let set: IconSet | null = null
let names: string[] = []
let loading: Promise<IconSet> | null = null

export async function loadIconSet(): Promise<IconSet> {
  if (set) return set
  loading ??= (async () => {
    const raw = await useStorage('assets:server').getItem('game-icons.json')
    const data = (typeof raw === 'string' ? JSON.parse(raw) : raw) as IconSet | null
    set = data ?? { width: 512, height: 512, icons: {} }
    names = Object.keys(set.icons)
    return set
  })()
  return loading
}

/** Whether an icon exists (before the set is loaded, only the rule icons are known) */
export function hasIcon(name: string): boolean {
  return set ? name in set.icons : RULE_ICONS.includes(name)
}

/** The icon a shop row shows: the chosen one, or a guess from its name */
export function shownIcon(chosen: string | null, name: string, category: string | null): string {
  if (chosen && hasIcon(chosen)) return chosen
  return guessShopIcon(name, category, hasIcon, names)
}

/** Icons whose names match all the words ("short sword" → "shortsword"-ish hits too) */
export function searchIcons(q: string, limit = 120): string[] {
  const words = q.toLowerCase().split(/[\s-]+/).filter(Boolean)
  if (!words.length) return []
  const hits = names.filter(n => words.every(w => n.includes(w)))
  return hits.sort((a, b) => Number(!a.startsWith(words[0]!)) - Number(!b.startsWith(words[0]!)) || a.length - b.length).slice(0, limit)
}
