import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { RULE_ICONS, guessShopIcon } from '../../types/shopIcons'

// Shop item icons: every icon the rules hand out exists, and common items land on sensible ones
const icons = JSON.parse(readFileSync(new URL('../../server/assets/game-icons.json', import.meta.url), 'utf8')).icons as Record<string, string>
const names = Object.keys(icons)
const has = (n: string) => n in icons
const guess = (name: string, category: string | null = 'gear') => guessShopIcon(name, category, has, names)

describe('shop icons', () => {
  it('only uses icons that are in the set', () => {
    expect(RULE_ICONS.filter(n => !has(n))).toEqual([])
  })

  it('guesses from the name, specific phrases first', () => {
    expect(guess('Potion of healing', 'common')).toBe('health-potion')
    expect(guess('Healer\'s kit')).toBe('first-aid-kit')
    expect(guess('Alterations')).toBe('sewing-needle')
    expect(guess('Back-room crates', 'lore')).toBe('wooden-crate')
    expect(guess('Ring of Mind Shielding', 'uncommon')).toBe('diamond-ring')
    expect(guess('Pre-Fall trinket', 'lore')).toBe('jigsaw-box')
    expect(guess('Sharpen and repair')).toBe('anvil')
    expect(guess('Tailored greatcoat')).toBe('pirate-coat')
    expect(guess('Small gemstone')).toBe('gems')
    expect(guess('Longsword')).toBe('broadsword')
    // A plain word that names an icon; then the category's fallback
    expect(guess('Brass telescope')).toBe('telescope')
    expect(guess('Something odd', 'lore')).toBe('tied-scroll')
  })
})
