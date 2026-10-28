import { describe, it, expect, beforeAll } from 'vitest'
import type Database from 'better-sqlite3'
import { getTestDb } from '../utils/test-db'
import { bestUnit, DEFAULT_DENOMINATIONS as D, formatCoins, payFromPurse, purseTotal } from '../../types/coins'
import { isShopLocationType } from '../../types/shop'
import { createShopItem, getPurse, ShopError, sellShopItem, setPurse } from '../../server/utils/shop'
import { getPlayerInventory } from '../../server/utils/inventory'

describe('coins', () => {
  it('formats prices in gold and below', () => {
    expect(formatCoins(11300, D)).toBe('113 gp')
    expect(formatCoins(150, D)).toBe('1 gp 5 sp')
    expect(formatCoins(6, D)).toBe('6 cp')
    expect(bestUnit(150, D)).toEqual({ code: 'SP', amount: 15 })
    expect(bestUnit(2300, D)).toEqual({ code: 'GP', amount: 23 })
  })

  it('pays small coins first and gives change', () => {
    expect(payFromPurse({ GP: 2, SP: 0, CP: 0, PP: 0 }, 150, D)).toEqual({ PP: 0, GP: 0, SP: 5, CP: 0 })
    expect(payFromPurse({ GP: 0, SP: 3, CP: 0, PP: 0 }, 25, D)).toEqual({ PP: 0, GP: 0, SP: 0, CP: 5 })
    expect(payFromPurse({ PP: 1, GP: 0, SP: 0, CP: 0 }, 150, D)).toEqual({ PP: 0, GP: 8, SP: 5, CP: 0 })
    expect(payFromPurse({ GP: 1 }, 150, D)).toBeNull()
  })

  it('treats shops, taverns and inns as places that sell', () => {
    expect(isShopLocationType('Shop')).toBe(true)
    expect(isShopLocationType('Tavern & Inn')).toBe(true)
    expect(isShopLocationType('Institution')).toBe(false)
  })
})

describe('selling from a shop', () => {
  let db: Database.Database
  let shopId: number
  let playerId: number
  let campaignId: number

  beforeAll(() => {
    db = getTestDb()
    const typeId = (name: string) => (db.prepare('SELECT id FROM entity_types WHERE name = ?').get(name) as { id: number }).id
    campaignId = Number(db.prepare('INSERT INTO campaigns (name) VALUES (?)').run('Shop Test').lastInsertRowid)
    for (const [code, rate, isDefault] of [['CP', 1, 0], ['SP', 10, 0], ['GP', 100, 1], ['PP', 1000, 0]] as const) {
      db.prepare('INSERT INTO currencies (campaign_id, code, name, symbol, exchange_rate, is_default) VALUES (?, ?, ?, ?, ?, ?)')
        .run(campaignId, code, code, code, rate, isDefault)
    }
    const entity = (type: string, name: string) => Number(
      db.prepare('INSERT INTO entities (type_id, campaign_id, name) VALUES (?, ?, ?)').run(typeId(type), campaignId, name).lastInsertRowid,
    )
    shopId = entity('Location', 'Foxglove & Fennel')
    playerId = entity('Player', 'Lyra')
    setPurse(db, playerId, { GP: 200, SP: 0, CP: 0, PP: 0 })
  })

  it('charges the purse, adds to inventory and lowers stock', () => {
    const potion = createShopItem(db, shopId, { name: 'Potion of healing', price_cp: 7500, weight: 0.5, stock: 3, category: 'common' })
    const sale = sellShopItem(db, { shopItemId: potion.id, playerId, quantity: 2 })
    expect(sale.paid_cp).toBe(15000)
    expect(sale.stock).toBe(1)
    expect(purseTotal(getPurse(db, playerId, D), D)).toBe(5000)

    // custom row became an Item, and buying again raises the count
    sellShopItem(db, { shopItemId: potion.id, playerId, quantity: 1, charge: false })
    const inv = getPlayerInventory(db, playerId)
    expect(inv.items).toHaveLength(1)
    expect(inv.items[0]).toMatchObject({ name: 'Potion of healing', quantity: 3, weight: 0.5 })
  })

  it('refuses when the purse or stock is short', () => {
    const tea = createShopItem(db, shopId, { name: 'Calming tea', price_cp: 6000, stock: 1 })
    expect(() => sellShopItem(db, { shopItemId: tea.id, playerId })).toThrow(ShopError)
    expect(() => sellShopItem(db, { shopItemId: tea.id, playerId, quantity: 2, charge: false })).toThrow('Not enough in stock')
    expect(purseTotal(getPurse(db, playerId, D), D)).toBe(5000)
  })
})
