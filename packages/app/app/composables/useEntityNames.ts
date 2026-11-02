/**
 * Names for entry-link codes ({{npc:12}}), looked up once and shared by the
 * whole app, so plain text can show "Ada Farrow" instead of the code.
 */
const names = reactive(new Map<string, string>())
const pending = new Set<string>()

const LABELS: Record<string, string> = {
  npc: 'NPC',
  location: 'Location',
  item: 'Item',
  faction: 'Faction',
  lore: 'Lore',
  player: 'Player',
  quest: 'Quest',
  session: 'Session',
}

async function lookup(type: string, id: number): Promise<string | null> {
  if (type === 'session') return null
  if (type === 'quest') {
    const q = await $fetch<{ name?: string, title?: string }>(`/api/quests/${id}`)
    return q?.name ?? q?.title ?? null
  }
  const res = await $fetch<{ entity?: { name?: string } }>(`/api/entities/${id}`)
  return res?.entity?.name ?? null
}

export function useEntityNames() {
  function nameOf(type: string, id: number): string {
    const key = `${type}:${id}`
    const known = names.get(key)
    if (known) return known
    if (import.meta.client && !pending.has(key)) {
      pending.add(key)
      lookup(type, id)
        .then((n) => { if (n) names.set(key, n) })
        .catch(() => {})
    }
    return `${LABELS[type] ?? 'Entry'} #${id}`
  }
  return { nameOf }
}
