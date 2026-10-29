import { describe, it, expect } from 'vitest'
import { ageText } from '../../types/age'
import { referenceKey } from '../../app/composables/useQuickCreate'

describe('ages and quick-create keys', () => {
  it('shows the human-equivalent age next to the real one', () => {
    expect(ageText(102, '27')).toBe('102 (human 27)')
    expect(ageText('33', '')).toBe('33')
    expect(ageText(null, '~58', 'Mensch')).toBe('Mensch ~58')
    expect(ageText(undefined, undefined)).toBe('')
  })

  it('turns a typed race or class into a Reference Data key', () => {
    expect(referenceKey('Half-Orc')).toBe('half_orc')
    expect(referenceKey('Myconid Foundling (homebrew)')).toBe('myconid_foundling_ho')
    expect(referenceKey('Tabaxi')).toBe('tabaxi')
    expect(referenceKey('Élan')).toBe('elan')
  })
})
