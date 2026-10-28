import type Database from 'better-sqlite3'
import {
  carryThresholds,
  isCarriedRelation,
  loadStatus,
  parseInventoryNotes,
  readItemWeight,
  readStrength,
  totalCarried,
  type InventoryEntry,
  type PartyLoadEntry,
  type PlayerInventory,
} from '~~/types/inventory'

interface InventoryRow {
  relation_id: number
  relation_type: string | null
  notes: string | null
  item_id: number
  name: string
  image_url: string | null
  metadata: string | null
}

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? v as Record<string, unknown> : null
  }
  catch {
    return null
  }
}

/** Strength from the entity's stat block (null when there is none). */
export function getEntityStrength(db: Database.Database, entityId: number): number | null {
  const row = db.prepare('SELECT values_json FROM entity_stats WHERE entity_id = ?').get(entityId) as
    | { values_json: string | null }
    | undefined
  return readStrength(parseJson(row?.values_json ?? null))
}

/** Items a character is carrying (links in either direction, carried relation types only). */
export function getInventoryEntries(db: Database.Database, entityId: number): InventoryEntry[] {
  const rows = db
    .prepare(
      `
      SELECT er.id AS relation_id, er.relation_type, er.notes,
             e.id AS item_id, e.name, e.image_url, e.metadata
      FROM entity_relations er
      JOIN entities e
        ON e.id = CASE WHEN er.from_entity_id = ? THEN er.to_entity_id ELSE er.from_entity_id END
      JOIN entity_types et ON et.id = e.type_id AND et.name = 'Item'
      WHERE (er.from_entity_id = ? OR er.to_entity_id = ?)
        AND e.deleted_at IS NULL
      ORDER BY e.name COLLATE NOCASE
    `,
    )
    .all(entityId, entityId, entityId) as InventoryRow[]

  return rows
    .filter(r => isCarriedRelation(r.relation_type))
    .map((r) => {
      const meta = parseJson(r.metadata)
      const notes = parseInventoryNotes(r.notes)
      return {
        relation_id: r.relation_id,
        relation_type: r.relation_type || 'owns',
        item_id: r.item_id,
        name: r.name,
        image_url: r.image_url,
        item_type: typeof meta?.type === 'string' ? meta.type : null,
        weight: readItemWeight(meta),
        quantity: notes.quantity,
        equipped: notes.equipped,
        text: notes.text,
      }
    })
}

export function getPlayerInventory(db: Database.Database, playerId: number): PlayerInventory {
  const items = getInventoryEntries(db, playerId)
  const strength = getEntityStrength(db, playerId)
  const carried = totalCarried(items)
  return {
    player_id: playerId,
    strength,
    thresholds: carryThresholds(strength),
    carried,
    status: loadStatus(carried, strength),
    missing_weights: items.filter(i => i.weight === null).length,
    items,
  }
}

/** Load overview for every (non-archived) player in a campaign. */
export function getPartyLoad(db: Database.Database, campaignId: number): PartyLoadEntry[] {
  const players = db
    .prepare(
      `
      SELECT e.id, e.name, e.image_url, e.metadata
      FROM entities e
      JOIN entity_types et ON et.id = e.type_id AND et.name = 'Player'
      WHERE e.campaign_id = ? AND e.deleted_at IS NULL AND e.archived_at IS NULL
      ORDER BY e.name COLLATE NOCASE
    `,
    )
    .all(campaignId) as Array<{ id: number, name: string, image_url: string | null, metadata: string | null }>

  return players.map((p) => {
    const inv = getPlayerInventory(db, p.id)
    const meta = parseJson(p.metadata)
    return {
      player_id: p.id,
      name: p.name,
      player_name: typeof meta?.player_name === 'string' ? meta.player_name : null,
      image_url: p.image_url,
      strength: inv.strength,
      thresholds: inv.thresholds,
      carried: inv.carried,
      status: inv.status,
      item_count: inv.items.reduce((n, i) => n + i.quantity, 0),
      missing_weights: inv.missing_weights,
    }
  })
}
