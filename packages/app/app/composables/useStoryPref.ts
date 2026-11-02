/**
 * A small per-viewer setting for the story pages (folded lanes, folded tray
 * groups …), remembered per campaign in this browser. Falls back quietly when
 * storage is blocked.
 */
export function useStoryPref<T>(name: string, fallback: T): Ref<T> {
  const store = useStoryBoardStore()
  const key = computed(() => `dmhero.storyBoard.${name}.${store.campaignId}`)
  const value = ref<T>(fallback) as Ref<T>
  watch(key, (k) => {
    try {
      const raw = localStorage.getItem(k)
      value.value = raw ? JSON.parse(raw) : fallback
    }
    catch {
      value.value = fallback
    }
  }, { immediate: true })
  watch(value, (v) => {
    try {
      localStorage.setItem(key.value, JSON.stringify(v))
    }
    catch {
      // storage blocked — works for this visit
    }
  }, { deep: true })
  return value
}

/** Folded / open state per tray group; big groups start folded. */
export function useTrayFolds(name: string, bigGroup: number) {
  const saved = useStoryPref<Record<string, boolean>>(name, {})
  const isFolded = (key: string, size: number) => saved.value[key] ?? size > bigGroup
  const toggle = (key: string, size: number) => {
    saved.value = { ...saved.value, [key]: !isFolded(key, size) }
  }
  const setAll = (groups: { key: string }[], folded: boolean) => {
    saved.value = Object.fromEntries(groups.map(g => [g.key, folded]))
  }
  return { isFolded, toggle, setAll }
}
