/**
 * BCP 47 locale for real-world date formatting that follows the UI language
 * (so month names are English in English, German in German, …).
 */
const DATE_LOCALES: Record<string, string> = {
  'en': 'en-US',
  'de': 'de-DE',
  'fr': 'fr-FR',
  'es': 'es-ES',
  'it': 'it-IT',
  'zh-CN': 'zh-CN',
}

export function toDateLocale(locale: string | undefined | null): string {
  return (locale && DATE_LOCALES[locale]) || 'en-US'
}

export function useDateLocale() {
  const { locale } = useI18n()
  return computed(() => toDateLocale(locale.value))
}

/**
 * Parses "YYYY-MM-DD" as a LOCAL calendar date. `new Date('2026-10-20')` is
 * midnight UTC, which shows as Oct 19 anywhere west of Greenwich.
 */
export function parseDateOnly(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value)
}
