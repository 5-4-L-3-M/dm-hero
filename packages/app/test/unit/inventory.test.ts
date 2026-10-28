import { describe, it, expect, beforeAll } from 'vitest'
import type Database from 'better-sqlite3'
import { getTestDb } from '../utils/test-db'
import { getPartyLoad, getPlayerInventory } from '../../server/utils/inventory'
import {
  carryThresholds,
  isCarriedRelation,
  loadStatus,
  parseInventoryNotes,
  readItemWeight,
  readStrength,
  serializeInventoryNotes,
  totalCarried,
} from '../../types/inventory'
import {
  celsiusToDisplay,
  displayToCelsius,
  displayToPounds,
  poundsToDisplay,
} from '../../app/composables/useUnits'

describe('carrying capacity (D&D 5e)', () => {
  it('derives thresholds from Strength', () => {
    expect(carryThresholds(14)).toEqual({ encumbered: 70, heavy: 140, capacity: 210 })
    expect(carryThresholds(null)).toBeNull()
    expect(carryThresholds(0)).toBeNull()
  })

  it('classifies load at and above each threshold', () => {
    expect(loadStatus(70, 14)).toBe('normal') // exactly STR×5 is still fine
    expect(loadStatus(70.5, 14)).toBe('encumbered')
    expect(loadStatus(140, 14)).toBe('encumbered')
    expect(loadStatus(141, 14)).toBe('heavy')
    expect(loadStatus(210, 14)).toBe('heavy')
    expect(loadStatus(211, 14)).toBe('over')
    expect(loadStatus(10, null)).toBe('unknown')
  })

  it('sums weight × quantity and ignores items without a weight', () => {
    expect(totalCarried([
      { weight: 1, quantity: 2 },
      { weight: 0.25, quantity: 10 },
      { weight: null, quantity: 5 },
    ])).toBe(4.5)
  })
})

describe('inventory notes', () => {
  it('reads quantity/equipped JSON, plain text and empty notes', () => {
    expect(parseInventoryNotes('{"quantity":3,"equipped":true}')).toEqual({ quantity: 3, equipped: true, text: null })
    expect(parseInventoryNotes({ quantity: 2, text: 'from the bet' })).toEqual({ quantity: 2, equipped: false, text: 'from the bet' })
    expect(parseInventoryNotes('won in a bet')).toEqual({ quantity: 1, equipped: false, text: 'won in a bet' })
    expect(parseInventoryNotes(null)).toEqual({ quantity: 1, equipped: false, text: null })
    expect(parseInventoryNotes('{"quantity":0}').quantity).toBe(1)
  })

  it('round-trips through serialize', () => {
    const n = { quantity: 4, equipped: true, text: 'spare' }
    expect(parseInventoryNotes(serializeInventoryNotes(n))).toEqual(n)
  })

  it('reads weight and strength defensively', () => {
    expect(readItemWeight({ weight: 2 })).toBe(2)
    expect(readItemWeight({ weight: '0.5' })).toBe(0.5)
    expect(readItemWeight({ weight: 0 })).toBe(0)
    expect(readItemWeight({ weight: null })).toBeNull()
    expect(readItemWeight({})).toBeNull()
    expect(readStrength({ str: { value: 16, modifier: 3 } })).toBe(16)
    expect(readStrength({ strength: 12 })).toBe(12)
    expect(readStrength({ dex: 14 })).toBeNull()
  })

  it('treats possession relation types as carried', () => {
    expect(isCarriedRelation('owns')).toBe(true)
    expect(isCarriedRelation('Carries')).toBe(true)
    expect(isCarriedRelation(null)).toBe(true)
    expect(isCarriedRelation('seeks')).toBe(false)
    expect(isCarriedRelation('lost')).toBe(false)
  })
})

describe('unit conversion', () => {
  it('shows °C as °F and converts typed °F back', () => {
    expect(celsiusToDisplay(20, 'imperial')).toBe(68)
    expect(celsiusToDisplay(-10, 'imperial')).toBe(14)
    expect(celsiusToDisplay(20, 'metric')).toBe(20)
    expect(displayToCelsius(68, 'imperial')).toBe(20)
    expect(displayToCelsius(70, 'imperial')).toBe(21.1)
  })

  it('shows pounds as lb or kg and converts typed kg back to pounds', () => {
    expect(poundsToDisplay(10, 'imperial')).toBe(10)
    expect(poundsToDisplay(10, 'metric')).toBe(4.54)
    expect(displayToPounds(1, 'metric')).toBe(2.205)
    expect(displayToPounds(3, 'imperial')).toBe(3)
  })
})

describe('inventory queries', () => {
  let db: Database.Database
  let campaignId: number
  let playerId: number
  let dagger: number
  let rope: number
  let tome: number

  beforeAll(() => {
    db = getTestDb()
    const typeId = (name: string) => (db.prepare('SELECT id FROM entity_types WHERE name = ?').get(name) as { id: number }).id
    campaignId = Number(db.prepare('INSERT INTO campaigns (name) VALUES (?)').run('Inventory Test').lastInsertRowid)
    const entity = (type: string, name: string, metadata?: object) => Number(
      db.prepare('INSERT INTO entities (type_id, campaign_id, name, metadata) VALUES (?, ?, ?, ?)')
        .run(typeId(type), campaignId, name, metadata ? JSON.stringify(metadata) : null).lastInsertRowid,
    )
    playerId = entity('Player', 'Zaladak', { player_name: 'Joe' })
    entity('Player', 'Lyra')
    dagger = entity('Item', 'Dagger', { type: 'weapon', weight: 1 })
    rope = entity('Item', 'Hempen Rope', { weight: 10 })
    tome = entity('Item', 'Ancient Tome')
    const sought = entity('Item', 'Lost Crown', { weight: 3 })

    const link = (to: number, type: string, notes: unknown) =>
      db.prepare('INSERT INTO entity_relations (from_entity_id, to_entity_id, relation_type, notes) VALUES (?, ?, ?, ?)')
        .run(playerId, to, type, notes === null ? null : typeof notes === 'string' ? notes : JSON.stringify(notes))
    link(dagger, 'owns', { quantity: 2, equipped: true })
    link(rope, 'carries', 'coiled on the pack')
    link(tome, 'owns', null)
    link(sought, 'seeks', null) // not carried

    const template = Number(db.prepare('INSERT INTO stat_templates (name) VALUES (?)').run('D&D 5e').lastInsertRowid)
    db.prepare('INSERT INTO entity_stats (entity_id, template_id, values_json) VALUES (?, ?, ?)')
      .run(playerId, template, JSON.stringify({ str: { value: 14, modifier: 2 } }))
  })

  it('lists carried items with quantity, equipped and weight', () => {
    const inv = getPlayerInventory(db, playerId)
    expect(inv.items.map(i => i.name)).toEqual(['Ancient Tome', 'Dagger', 'Hempen Rope'])
    const d = inv.items.find(i => i.item_id === dagger)!
    expect(d).toMatchObject({ quantity: 2, equipped: true, weight: 1, item_type: 'weapon' })
    expect(inv.items.find(i => i.item_id === rope)!.text).toBe('coiled on the pack')
    expect(inv.items.find(i => i.item_id === tome)!.weight).toBeNull()
    expect(inv.carried).toBe(12)
    expect(inv.strength).toBe(14)
    expect(inv.thresholds?.capacity).toBe(210)
    expect(inv.status).toBe('normal')
    expect(inv.missing_weights).toBe(1)
  })

  it('summarises every player for the party card', () => {
    const party = getPartyLoad(db, campaignId)
    expect(party.map(p => p.name)).toEqual(['Lyra', 'Zaladak'])
    const z = party.find(p => p.player_id === playerId)!
    expect(z).toMatchObject({ player_name: 'Joe', carried: 12, item_count: 4, status: 'normal' })
    expect(party.find(p => p.name === 'Lyra')).toMatchObject({ carried: 0, status: 'unknown', thresholds: null })
  })

  it('updates weight in metadata JSON without touching other keys', () => {
    db.prepare('UPDATE entities SET metadata = json_set(COALESCE(metadata, \'{}\'), \'$.weight\', ?) WHERE id = ?').run(3, tome)
    db.prepare('UPDATE entities SET metadata = json_set(COALESCE(metadata, \'{}\'), \'$.weight\', ?) WHERE id = ?').run(1.5, dagger)
    const meta = JSON.parse((db.prepare('SELECT metadata FROM entities WHERE id = ?').get(dagger) as { metadata: string }).metadata)
    expect(meta).toEqual({ type: 'weapon', weight: 1.5 })
    expect(getPlayerInventory(db, playerId).carried).toBe(16)
  })
})
