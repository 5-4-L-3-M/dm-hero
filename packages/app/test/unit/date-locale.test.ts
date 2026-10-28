import { describe, it, expect } from 'vitest'
import { parseDateOnly, toDateLocale } from '../../app/composables/useDateLocale'

describe('real-world date formatting', () => {
  it('maps UI languages to date locales (English month names in English)', () => {
    expect(toDateLocale('en')).toBe('en-US')
    expect(toDateLocale('de')).toBe('de-DE')
    expect(toDateLocale('zh-CN')).toBe('zh-CN')
    expect(toDateLocale(undefined)).toBe('en-US')
    const d = parseDateOnly('2026-10-20')
    expect(d.toLocaleDateString(toDateLocale('en'), { month: 'long' })).toBe('October')
  })

  it('reads YYYY-MM-DD as the local calendar day, not UTC midnight', () => {
    const d = parseDateOnly('2026-10-20')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 20])
    expect(parseDateOnly('2026-10-20T12:00:00Z').toISOString()).toBe('2026-10-20T12:00:00.000Z')
  })
})
