import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { getTestDb } from '../utils/test-db'
import { parseStatText, rollParts } from '../../types/statblock'
import { convertNpcText, getMonster, seedSrd, type SrdMonster } from '../../server/utils/monsters'
import { loadParticipants } from '../../server/utils/encounterParticipants'

let db: Database.Database
beforeAll(() => {
  const g = globalThis as Record<string, unknown>
  g.createError = (o: { statusCode: number, message: string }) => Object.assign(new Error(o.message), { statusCode: o.statusCode })
})
beforeEach(() => {
  db = getTestDb()
})

const guard = `Backup fight: The guards, anywhere in the Courtyard.

AC 16 - HP 22 - Speed 30 ft
STR 14 (+2) DEX 12 (+1) CON 13 (+1) INT 10 (+0) WIS 11 (+0) CHA 10 (+0)

**Shield Wall:** +1 AC while next to another guard.

**Spear:** +4 to hit, 1d6 + 2 piercing, or 1d8 + 2 with two hands.

**Light crossbow:** +3 to hit, 1d8 + 1 piercing. Range 80 ft.

## Rules
- They want arrests, not bodies.`

describe('stat blocks', () => {
  it('reads an NPC stat block written as text and leaves the story in the notes', () => {
    const p = parseStatText(guard)!
    expect(p.block).toMatchObject({ ac: 16, hp: 22, speed: '30 ft', str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 10 })
    expect(p.block.traits).toEqual([{ name: 'Shield Wall', text: '+1 AC while next to another guard.' }])
    expect(p.block.actions!.map(a => a.name)).toEqual(['Spear', 'Light crossbow'])
    const c = convertNpcText(guard)!
    expect(c.rest).toContain('Backup fight')
    expect(c.rest).toContain('They want arrests')
    expect(c.rest).not.toContain('AC 16')
    expect(c.rest).not.toContain('Spear')
    expect(parseStatText('Just a friendly baker.')).toBeNull()
  })

  it('finds what to roll in an attack', () => {
    expect(rollParts('Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.')).toEqual([
      { kind: 'hit', label: '+4 to hit', dice: '1d20+4' },
      { kind: 'damage', label: '1d6+2 slashing', dice: '1d6+2', damageType: 'slashing' },
    ])
    expect(rollParts('Each creature must make a DC 13 Dexterity saving throw, taking 22 (5d8) fire damage').map(p => p.label)).toEqual(['5d8 fire', 'DC 13 Dexterity'])
  })

  it('seeds the SRD bestiary once and lets monsters fight without an entry', async () => {
    const srd = JSON.parse(readFileSync(new URL('../../server/assets/srd-monsters.json', import.meta.url), 'utf8')) as SrdMonster[]
    const campaignId = Number(db.prepare('INSERT INTO campaigns (name) VALUES (?)').run('Aevum').lastInsertRowid)
    await seedSrd(db, campaignId, srd)
    await seedSrd(db, campaignId, srd)
    expect((db.prepare('SELECT COUNT(*) AS n FROM monsters WHERE campaign_id = ?').get(campaignId) as { n: number }).n).toBe(srd.length)
    const goblinId = (db.prepare('SELECT id FROM monsters WHERE srd_key = ?').get('goblin') as { id: number }).id
    expect(getMonster(db, goblinId)!.block).toMatchObject({ ac: 15, hp: 7, cr: '1/4' })

    const enc = Number(db.prepare('INSERT INTO encounters (campaign_id, name) VALUES (?, ?)').run(campaignId, 'Ambush').lastInsertRowid)
    const pid = Number(db.prepare('INSERT INTO encounter_participants (encounter_id, monster_id, display_name, current_hp, max_hp) VALUES (?, ?, ?, ?, ?)').run(enc, goblinId, 'Goblin', 7, 7).lastInsertRowid)
    db.prepare('INSERT INTO encounter_effects (participant_id, name) VALUES (?, ?)').run(pid, 'Prone')
    const [p] = loadParticipants(db, enc)
    expect(p).toMatchObject({ entity_type: 'Monster', monster_id: goblinId, display_name: 'Goblin' })
    expect((p!.statblock as { ac: number }).ac).toBe(15)
    expect((p!.effects as unknown[]).length).toBe(1)
  })
})
