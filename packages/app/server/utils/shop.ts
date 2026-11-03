import type Database from 'better-sqlite3'
import { shownIcon } from './gameIcons'
import {
  cleanPurse,
  DEFAULT_DENOMINATIONS,
  payFromPurse,
  purseTotal,
  sortDenominations,
  type Denomination,
  type Purse,
} from '~~/types/coins'
import { serializeInventoryNotes } from '~~/types/inventory'
import { priceAdjustment } from './reputation'
import { tiersFor } from '~~/types/reputation'
import { isShopCategory, type ShopItem, type ShopItemInput, type ShopSaleResult } from '~~/types/shop'
import { getInventoryEntries } from './inventory'

/** Thrown for bad input / not found; endpoints turn it into an HTTP error. */
export class ShopError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

interface ShopItemRow extends Omit<ShopItem, 'category' | 'secret' | 'req_met' | 'icon_shown'> {
  category: string | null
  secret: number
  campaign_id: number
}

const SHOP_COLUMNS = `s.id, s.location_id, s.item_id, s.name, s.description, s.category, s.weight, s.price_cp, s.price_note, s.stock, s.sort_order,
  s.secret, s.requirement, s.req_subject_id, s.req_tier, re.name AS req_subject_name, ret.name AS req_subject_type, l.campaign_id,
  s.icon, it.image_url AS item_image`
const SHOP_FROM = `shop_items s
  JOIN entities l ON l.id = s.location_id
  LEFT JOIN entities it ON it.id = s.item_id AND it.deleted_at IS NULL
  LEFT JOIN entities re ON re.id = s.req_subject_id AND re.deleted_at IS NULL
  LEFT JOIN entity_types ret ON ret.id = re.type_id`

/** Met when the party, or any one player, is at least the required tier with them */
function requirementMet(db: Database.Database, row: ShopItemRow): boolean | null {
  if (!row.req_subject_id || !row.req_tier || !row.req_subject_type) return null
  const tiers = tiersFor(row.req_subject_type, 'rep')
  const need = tiers.find(t => t.key === row.req_tier)
  if (!need) return null
  const rows = db.prepare('SELECT COALESCE(SUM(delta), 0) AS p FROM rep_events WHERE campaign_id = ? AND subject_id = ? AND kind = \'rep\' GROUP BY player_id')
    .all(row.campaign_id, row.req_subject_id) as { p: number }[]
  const best = rows.length ? Math.max(...rows.map(r => r.p)) : 0
  return best >= need.min
}

function toShopItem(db: Database.Database, row: ShopItemRow): ShopItem {
  const { campaign_id: _c, ...rest } = row
  return {
    ...rest,
    category: isShopCategory(row.category) ? row.category : null,
    secret: !!row.secret,
    req_subject_name: row.req_subject_id ? row.req_subject_name : null,
    req_subject_type: row.req_subject_id ? row.req_subject_type : null,
    req_met: requirementMet(db, row),
    icon_shown: shownIcon(row.icon, row.name, row.category),
  }
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
    .prepare(`SELECT ${SHOP_COLUMNS} FROM ${SHOP_FROM} WHERE s.location_id = ? ORDER BY s.secret, s.sort_order, s.id`)
    .all(locationId) as ShopItemRow[]
  return rows.map(r => toShopItem(db, r))
}

export function getShopItem(db: Database.Database, id: number): ShopItem | null {
  const row = db.prepare(`SELECT ${SHOP_COLUMNS} FROM ${SHOP_FROM} WHERE s.id = ?`).get(id) as ShopItemRow | undefined
  return row ? toShopItem(db, row) : null
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
  if (input.secret !== undefined) values.secret = input.secret ? 1 : 0
  if (input.icon !== undefined) values.icon = /^[a-z0-9-]{1,60}$/.test(String(input.icon ?? '')) ? String(input.icon) : null
  if (input.requirement !== undefined) values.requirement = optionalText(input.requirement)?.slice(0, 120) ?? null
  if (input.req_subject_id !== undefined) {
    const id = Number(input.req_subject_id) || null
    if (id && !db.prepare('SELECT 1 FROM entities e JOIN entity_types t ON t.id = e.type_id WHERE e.id = ? AND e.deleted_at IS NULL AND t.name IN (\'NPC\', \'Faction\', \'Location\')').get(id)) {
      throw new ShopError(400, 'Reputation lock: unknown NPC, faction or place')
    }
    values.req_subject_id = id
  }
  if (input.req_tier !== undefined) values.req_tier = optionalText(input.req_tier)
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

    // No price given → the listed price, moved by how the place feels about the party
    const each = options.priceEachCp ?? Math.max(0, Math.round((row.price_cp ?? 0) * (1 + priceAdjustment(db, campaignId, row.location_id).pct / 100)))
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
        serializeInventoryNotes({ quantity: existing.quantity + quantity, equipped: existing.equipped, text: existing.text, missing: existing.missing }),
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

// --- selling TO the shop: the party sells loot, the shopkeeper pays ------------------

/** What one of an item is worth in base coin (its Value + currency), or null */
export function itemValueCp(db: Database.Database, itemId: number, campaignId: number): number | null {
  const row = db.prepare('SELECT metadata FROM entities WHERE id = ?').get(itemId) as { metadata: string | null } | undefined
  let meta: Record<string, unknown> = {}
  try {
    meta = row?.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {}
  }
  catch {
    meta = {}
  }
  const value = Number(meta.value)
  if (!Number.isFinite(value) || value <= 0) return null
  const cur = meta.currency_id
    ? db.prepare('SELECT exchange_rate AS rate FROM currencies WHERE id = ? AND campaign_id = ?').get(Number(meta.currency_id), campaignId) as { rate: number } | undefined
    : undefined
  const rate = cur?.rate ?? getCampaignDenominations(db, campaignId).find(d => d.isDefault)?.rate ?? 100
  return Math.round(value * rate)
}

export interface SellOffer {
  relation_id: number
  item_id: number
  name: string
  quantity: number
  equipped: boolean
  /** One item's listed worth (base coin), null when the item has no value */
  value_cp: number | null
  /** What this shop pays for one: half the value, moved by how they feel about the party */
  offer_cp: number | null
}

/** A character's sellable items with this shop's offer for each */
export function sellOffers(db: Database.Database, locationId: number, playerId: number): { pct: number, offers: SellOffer[] } {
  const campaignId = getEntityCampaignId(db, locationId, 'Location')
  if (campaignId === null) throw new ShopError(404, 'Shop not found')
  if (getEntityCampaignId(db, playerId, 'Player') !== campaignId) throw new ShopError(404, 'Player not found')
  const { pct } = priceAdjustment(db, campaignId, locationId)
  const offers = getInventoryEntries(db, playerId)
    .filter(e => !e.missing && e.quantity > 0)
    .map((e) => {
      const value = itemValueCp(db, e.item_id, campaignId)
      return {
        relation_id: e.relation_id,
        item_id: e.item_id,
        name: e.name,
        quantity: e.quantity,
        equipped: e.equipped,
        value_cp: value,
        // Friendly shops pay a little more, unfriendly ones less
        offer_cp: value === null ? null : Math.max(0, Math.round((value / 2) * (1 - pct / 100))),
      }
    })
  return { pct, offers }
}

/** Coins for a payout: as much as possible in the main coin (gold), the rest in smaller ones */
function payout(total: number, denoms: Denomination[]): Purse {
  const main = denoms.find(d => d.isDefault) ?? denoms[0]
  const usable = sortDenominations(denoms).filter(d => !main || d.rate <= main.rate)
  const coins: Purse = {}
  let left = Math.round(total)
  for (const d of usable) {
    const n = Math.floor(left / d.rate)
    if (n > 0) {
      coins[d.code] = n
      left -= n * d.rate
    }
  }
  return coins
}

export interface BuyFromPlayerOptions {
  locationId: number
  playerId: number
  relationId: number
  quantity?: number
  /** Price for one (base coin); default is the shop's offer */
  priceEachCp?: number | null
  /** Put it on the shop's shelf afterwards (default true) */
  addToStock?: boolean
}

/** The shop buys from a character: item leaves the inventory, coin goes into the purse. */
export function buyFromPlayer(db: Database.Database, options: BuyFromPlayerOptions) {
  return db.transaction(() => {
    const { offers } = sellOffers(db, options.locationId, options.playerId)
    const offer = offers.find(o => o.relation_id === Number(options.relationId))
    if (!offer) throw new ShopError(404, 'That item isn\'t in their inventory')
    const campaignId = getEntityCampaignId(db, options.locationId)!
    const quantity = Math.min(offer.quantity, Math.max(1, Math.floor(Number(options.quantity) || 1)))
    const each = options.priceEachCp ?? offer.offer_cp ?? 0
    if (!Number.isFinite(each) || each < 0) throw new ShopError(400, 'Price must be 0 or more')
    const total = Math.round(each * quantity)

    // Out of the inventory
    const entry = getInventoryEntries(db, options.playerId).find(e => e.relation_id === offer.relation_id)!
    if (entry.quantity > quantity) {
      db.prepare('UPDATE entity_relations SET notes = ? WHERE id = ?')
        .run(serializeInventoryNotes({ quantity: entry.quantity - quantity, equipped: entry.equipped, text: entry.text, missing: entry.missing }), entry.relation_id)
    }
    else {
      db.prepare('DELETE FROM entity_relations WHERE id = ?').run(entry.relation_id)
    }

    // Into the purse
    const denoms = getCampaignDenominations(db, campaignId)
    const purse = getPurse(db, options.playerId, denoms)
    const paid = payout(total, denoms)
    for (const [code, n] of Object.entries(paid)) purse[code] = (purse[code] ?? 0) + n
    setPurse(db, options.playerId, purse)

    // Onto the shelf
    let shopItemId: number | null = null
    if (options.addToStock !== false) {
      const shelf = db.prepare('SELECT id, stock FROM shop_items WHERE location_id = ? AND item_id = ?').get(options.locationId, offer.item_id) as { id: number, stock: number | null } | undefined
      if (shelf) {
        if (shelf.stock !== null) db.prepare('UPDATE shop_items SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, shelf.id)
        shopItemId = shelf.id
      }
      else {
        const meta = db.prepare('SELECT description FROM entities WHERE id = ?').get(offer.item_id) as { description: string | null }
        shopItemId = createShopItem(db, options.locationId, {
          name: offer.name,
          item_id: offer.item_id,
          description: meta?.description ?? null,
          price_cp: offer.value_cp,
          stock: quantity,
        }).id
      }
    }
    return { quantity, paid_cp: total, coins: paid, purse, purse_total: purseTotal(purse, denoms), shop_item_id: shopItemId }
  })()
}
