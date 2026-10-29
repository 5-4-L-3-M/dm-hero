import { describe, expect, it } from 'vitest'
import { characterInfoToMetadata, classLine, emptyCharacterInfo, hasCharacterInfo, readCharacterInfo, totalLevel } from '../../types/player'

describe('player character details', () => {
  it('reads metadata, keeping multiclass entries and skipping junk', () => {
    const info = readCharacterInfo({
      race: ' Human (Variant) ',
      classes: [{ name: 'Pirate', level: 3, subclass: 'Buccaneer' }, { name: 'Warlock', level: '1' }, { name: '' }, 'Fighter'],
      ac: '10',
      hp: 34,
      passive_perception: '',
    })
    expect(info.race).toBe('Human (Variant)')
    expect(info.classes).toEqual([
      { name: 'Pirate', level: 3, subclass: 'Buccaneer' },
      { name: 'Warlock', level: 1, subclass: null },
      { name: 'Fighter', level: null, subclass: null },
    ])
    expect(info.ac).toBe(10)
    expect(info.passive_perception).toBeNull()
    expect(classLine(info)).toBe('Pirate 3 / Warlock 1 / Fighter')
    expect(totalLevel(info)).toBe(4)
  })

  it('writes empty fields as null so they clear', () => {
    const info = emptyCharacterInfo()
    info.race = 'Wood Elf'
    info.classes = [{ name: ' Druid ', level: 4, subclass: '' }, { name: '  ', level: 2 }]
    const meta = characterInfoToMetadata(info)
    expect(meta.race).toBe('Wood Elf')
    expect(meta.background).toBeNull()
    expect(meta.ac).toBeNull()
    expect(meta.classes).toEqual([{ name: 'Druid', level: 4, subclass: null }])
  })

  it('knows when anything is set', () => {
    expect(hasCharacterInfo(readCharacterInfo(null))).toBe(false)
    expect(hasCharacterInfo(readCharacterInfo({ hp: 0 }))).toBe(true)
    expect(hasCharacterInfo(readCharacterInfo({ email: 'x' }))).toBe(false)
  })
})
