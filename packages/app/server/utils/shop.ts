import type Database from 'better-sqlite3'
import {
  cleanPurse,
  DEFAULT_DENOMINATIONS,
  payFromPurse,
  purseTotal,
  type Denomination,
  type Purse,
} from '~~/types/coins'
import { serializeInventoryNotes } from '~~/types/inventory'
import { isShopCategory, type ShopItem, type ShopItemInput, type ShopSaleResult } from '~~/types/shop'
import { getInventoryEntries } from './inventory'

/** Thrown for bad input / not found; endpoints turn it into an HTTP error. */
export class ShopError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

interface ShopItemRow extends Omit<ShopItem, 'category'> {
  category: string | null
}

const SHOP_COLUMNS = 'id, location_id, item_id, name, description, category, weight, price_cp, price_note, stock, sort_order'

function toShopItem(row: ShopItemRow): ShopItem {
  return { ...row, category: isShopCategory(row.category) ? row.category : null }
}

/** The campaign's coins, most valuable first (falls back to pp/gp/sp/cp). */
export function getCampaignDenominations(db: Database.Database, campaignId: number): Denomination[] {
  const rows = db
    .prepare('SELECT code, exchange_rate AS rate, is_default FROM currencies WHERE campaign_id = ? ORDER BY exchange_rate DESC')
    .all(campaignId) as { code: string, rate: number, is_default: number }[]
  const list = rows.filter(r => r.rate > 0).map(r => ({ code: r.code, rate: r.rate, isDefault: r.is_default === 1 }))
  return list.length > 0 ? list : DEFAULT_DENOMINATIONS
}

export function getPurse(db: Database.Database, entityId: number, denoms: Denomination[]): Purse {
  const rows = db.prepare('SELECT currency_code, amount FROM entity_coins WHERE entity_id = ?').all(entityId) as {
    currency_code: string
    amount: number
  }[]
  return cleanPurse(Object.fromEntries(rows.map(r => [r.currency_code, r.amount])), denoms)
}

export function setPurse(db: Database.Database, entityId: number, purse: Purse) {
  const upsert = db.prepare(`
    INSERT INTO entity_coins (entity_id, currency_code, amount) VALUES (?, ?, ?)
    ON CONFLICT(entity_id, currency_code) DO UPDATE SET amount = excluded.amount
  `)
  for (const [code, amount] of Object.entries(purse)) upsert.run(entityId, code, amount)
}

export function getEntityCampaignId(db: Database.Database, entityId: number, typeName?: string): number | null {
  const row = db
    .prepare(
      `SELECT e.campaign_id FROM entities e JOIN entity_types t ON t.id = e.type_id
       WHERE e.id = ? AND e.deleted_at IS NULL ${typeName ? 'AND t.name = ?' : ''}`,
    )
    .get(...(typeName ? [entityId, typeName] : [entityId])) as { campaign_id: number } | undefined
  return row?.campaign_id ?? null
}

export function listShopItems(db: Database.Database, locationId: number): ShopItem[] {
  const rows = db
    .prepare(`SELECT ${SHOP_COLUMNS} FROM shop_items WHERE location_id = ? ORDER BY sort_order, id`)
    .all(locationId) as ShopItemRow[]
  return rows.map(toShopItem)
}

export function getShopItem(db: Database.Database, id: number): ShopItem | null {
  const row = db.prepare(`SELECT ${SHOP_COLUMNS} FROM shop_items WHERE id = ?`).get(id) as ShopItemRow | undefined
  return row ? toShopItem(row) : null
}

function optionalNumber(value: unknown, field: string, { integer = false } = {}): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) throw new ShopError(400, `${field} must be 0 or more`)
  return integer ? Math.floor(n) : Math.round(n * 1000) / 1000
}

function optionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

/** Validated column values for an insert/update (only the keys that were sent). */
export function shopItemValues(db: Database.Database, input: ShopItemInput, { requireName = false } = {}) {
  const values: Record<string, unknown> = {}
  if (input.name !== undefined || requireName) {
    const name = optionalText(input.name)
    if (!name) throw new ShopError(400, 'Name is required')
    values.name = name.slice(0, 200)
  }
  if (input.description !== undefined) values.description = optionalText(input.description)
  if (input.category !== undefined) {
    if (input.category !== null && input.category !== '' && !isShopCategory(input.category)) {
      throw new ShopError(400, 'Unknown category')
    }
    values.category = input.category || null
  }
  if (input.weight !== undefined) values.weight = optionalNumber(input.weight, 'Weight')
  if (input.price_cp !== undefined) values.price_cp = optionalNumber(input.price_cp, 'Price')
  if (input.price_note !== undefined) values.price_note = optionalText(input.price_note)
  if (input.stock !== undefined) values.stock = optionalNumber(input.stock, 'Stock', { integer: true })
  if (input.item_id !== undefined) {
    if (input.item_id === null) values.item_id = null
    else if (getEntityCampaignId(db, Number(input.item_id), 'Item') === null) throw new ShopError(400, 'Item not found')
    else values.item_id = Number(input.item_id)
  }
  return values
}

export function createShopItem(db: Database.Database, locationId: number, input: ShopItemInput): ShopItem {
  if (getEntityCampaignId(db, locationId, 'Location') === null) throw new ShopError(404, 'Location not found')
  const values = shopItemValues(db, input, { requireName: true })
  const next = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM shop_items WHERE location_id = ?').get(locationId) as { n: number }
  const cols = ['location_id', 'sort_order', ...Object.keys(values)]
  const result = db
    .prepare(`INSERT INTO shop_items (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
    .run(locationId, next.n, ...Object.values(values))
  return getShopItem(db, Number(result.lastInsertRowid))!
}

export function updateShopItem(db: Database.Database, id: number, input: ShopItemInput): ShopItem {
  if (!getShopItem(db, id)) throw new ShopError(404, 'Shop item not found')
  const values = shopItemValues(db, input)
  const keys = Object.keys(values)
  if (keys.length > 0) {
    db.prepare(`UPDATE shop_items SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(...Object.values(values), id)
  }
  return getShopItem(db, id)!
}

/** The Items-list entry a shop row sells (creates one for custom rows). */
function ensureItemEntity(db: Database.Database, row: ShopItem, campaignId: number, denoms: Denomination[]): number {
  if (row.item_id && getEntityCampaignId(db, row.item_id, 'Item') !== null) return row.item_id

  const type = db.prepare('SELECT id FROM entity_types WHERE name = \'Item\'').get() as { id: number }
  const main = denoms.find(d => d.isDefault) ?? denoms[0]
  const currency = main
    ? (db.prepare('SELECT id FROM currencies WHERE campaign_id = ? AND code = ?').get(campaignId, main.code) as { id: number } | undefined)
    : undefined
  const metadata: Record<string, unknown> = {}
  if (row.weight !== null) metadata.weight = row.weight
  if (row.price_cp !== null && main) {
    metadata.value = Math.round((row.price_cp / main.rate) * 100) / 100
    if (currency) metadata.currency_id = currency.id
  }
  const result = db
    .prepare('INSERT INTO entities (type_id, campaign_id, name, description, metadata) VALUES (?, ?, ?, ?, ?)')
    .run(type.id, campaignId, row.name, row.description, JSON.stringify(metadata))
  const itemId = Number(result.lastInsertRowid)
  db.prepare('UPDATE shop_items SET item_id = ? WHERE id = ?').run(itemId, row.id)
  return itemId
}

export interface SellOptions {
  shopItemId: number
  playerId: number
  quantity?: number
  /** Override the listed price (haggling, "1–10 gp" curios). Base coin. */
  priceEachCp?: number | null
  /** Take the money out of the character's purse (default true) */
  charge?: boolean
}

/** Buy from a shop: pay from the purse, add to the character's inventory, lower stock. */
export function sellShopItem(db: Database.Database, options: SellOptions): ShopSaleResult {
  const sell = db.transaction((): ShopSaleResult => {
    const row = getShopItem(db, options.shopItemId)
    if (!row) throw new ShopError(404, 'Shop item not found')
    const campaignId = getEntityCampaignId(db, row.location_id)
    if (campaignId === null) throw new ShopError(404, 'Shop not found')
    if (getEntityCampaignId(db, options.playerId, 'Player') !== campaignId) throw new ShopError(404, 'Player not found')

    const quantity = Math.max(1, Math.floor(Number(options.quantity) || 1))
    if (row.stock !== null && row.stock < quantity) throw new ShopError(409, 'Not enough in stock')

    const each = options.priceEachCp ?? row.price_cp ?? 0
    if (!Number.isFinite(each) || each < 0) throw new ShopError(400, 'Price must be 0 or more')
    const total = Math.round(each * quantity)
    const charge = options.charge !== false

    const denoms = getCampaignDenominations(db, campaignId)
    let purse = getPurse(db, options.playerId, denoms)
    if (charge && total > 0) {
      const after = payFromPurse(purse, total, denoms)
      if (!after) throw new ShopError(409, 'Not enough coin')
      setPurse(db, options.playerId, after)
      purse = after
    }

    const itemId = ensureItemEntity(db, row, campaignId, denoms)
    const existing = getInventoryEntries(db, options.playerId).find(e => e.item_id === itemId)
    if (existing) {
      db.prepare('UPDATE entity_relations SET notes = ? WHERE id = ?').run(
        serializeInventoryNotes({ quantity: existing.quantity + quantity, equipped: existing.equipped, text: existing.text }),
        existing.relation_id,
      )
    }
    else {
      db.prepare('INSERT INTO entity_relations (from_entity_id, to_entity_id, relation_type, notes) VALUES (?, ?, ?, ?)').run(
        options.playerId,
        itemId,
        'bought',
        serializeInventoryNotes({ quantity, equipped: false, text: null }),
      )
    }

    let stock = row.stock
    if (stock !== null) {
      stock -= quantity
      db.prepare('UPDATE shop_items SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(stock, row.id)
    }

    return {
      item_id: itemId,
      quantity,
      paid_cp: charge ? total : 0,
      purse,
      purse_total: purseTotal(purse, denoms),
      stock,
    }
  })
  return sell()
}

/** Turns a ShopError into the HTTP error Nitro expects. */
export function rethrowShopError(error: unknown): never {
  if (error instanceof ShopError) throw createError({ statusCode: error.statusCode, message: error.message })
  throw error
}
