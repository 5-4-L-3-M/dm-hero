/**
 * game-icons.net SVG bodies, fetched in batches and cached for the visit.
 * `body(name)` is reactive: it fills in once the batch arrives.
 */
const bodies = reactive(new Map<string, string | null>())
const queued = new Set<string>()
let timer: ReturnType<typeof setTimeout> | null = null

async function flush() {
  timer = null
  const names = [...queued]
  queued.clear()
  for (let i = 0; i < names.length; i += 150) {
    const part = names.slice(i, i + 150)
    try {
      const r = await $fetch<{ icons: Record<string, string> }>('/api/icons', { query: { names: part.join(',') } })
      for (const n of part) bodies.set(n, r.icons[n] ?? null)
    }
    catch {
      for (const n of part) bodies.delete(n)
    }
  }
}

export function useGameIcons() {
  function body(name: string | null | undefined): string | null {
    if (!name) return null
    if (!bodies.has(name) && !queued.has(name)) {
      queued.add(name)
      timer ??= setTimeout(flush, 20)
    }
    return bodies.get(name) ?? null
  }
  async function search(q: string): Promise<string[]> {
    if (!q.trim()) return []
    return await $fetch<string[]>('/api/icons/search', { query: { q } }).catch(() => [])
  }
  return { body, search }
}
