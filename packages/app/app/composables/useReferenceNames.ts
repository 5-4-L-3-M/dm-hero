/**
 * Race / class keys ("highelf") → the name to show, in the current language.
 * Loaded once per app session; custom races and classes included.
 */
interface RefRow { name: string, name_de?: string | null, name_en?: string | null }

const races = ref<RefRow[]>([])
const classes = ref<RefRow[]>([])
let loaded: Promise<void> | null = null

export function useReferenceNames() {
  const { locale, t, te } = useI18n()

  if (!loaded && import.meta.client) {
    loaded = Promise.all([
      $fetch<RefRow[]>('/api/races').catch(() => []),
      $fetch<RefRow[]>('/api/classes').catch(() => []),
    ]).then(([r, c]) => {
      races.value = r
      classes.value = c
    })
  }

  function label(list: RefRow[], key: string, i18nBase: string): string {
    const row = list.find(x => x.name === key)
    if (row) return (locale.value === 'de' ? row.name_de : row.name_en) || row.name_en || row.name
    return te(`${i18nBase}.${key}`) ? t(`${i18nBase}.${key}`) : key
  }

  return {
    raceName: (key: unknown) => (typeof key === 'string' && key ? label(races.value, key, 'referenceData.raceNames') : ''),
    classNames: (keys: unknown) => (Array.isArray(keys) ? keys : keys ? [keys] : [])
      .filter((k): k is string => typeof k === 'string' && !!k)
      .map(k => label(classes.value, k, 'referenceData.classNames')),
    /** Call after creating a race/class so new names show up */
    reload: () => {
      loaded = null
    },
  }
}
