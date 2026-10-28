// Shop inventories: what a Shop (or tavern / inn) location has for sale.
// Prices are in the campaign's base coin (copper); weights in pounds.

export const SHOP_CATEGORIES = ['gear', 'common', 'uncommon', 'rare', 'very_rare', 'legendary', 'lore'] as const
export type ShopCategory = (typeof SHOP_CATEGORIES)[number]

export interface ShopItem {
  id: number
  location_id: number
  /** Linked entry in the Items list (custom rows get one the first time they're sold) */
  item_id: number | null
  name: string
  description: string | null
  category: ShopCategory | null
  /** Pounds */
  weight: number | null
  /** Base coin (copper). null = no fixed price */
  price_cp: number | null
  /** Extra price text: "a sheet", "+ a promise", "not for sale" */
  price_note: string | null
  /** null = plenty */
  stock: number | null
  sort_order: number
}

export interface ShopItemInput {
  name?: string
  description?: string | null
  category?: string | null
  weight?: number | string | null
  price_cp?: number | string | null
  price_note?: string | null
  stock?: number | string | null
  item_id?: number | null
}

export interface ShopSaleResult {
  item_id: number
  quantity: number
  paid_cp: number
  purse: Record<string, number>
  purse_total: number
  stock: number | null
}

/** Locations whose type says they sell things get a Shop tab. */
export function isShopLocationType(type: string | null | undefined): boolean {
  return !!type && /\b(shop|store|market|tavern|inn)\b/i.test(type)
}

export function isShopCategory(value: unknown): value is ShopCategory {
  return typeof value === 'string' && (SHOP_CATEGORIES as readonly string[]).includes(value)
}

/** Gear first, then magic by rarity, then story items, like the festival price lists. */
export function sortShopItems(items: ShopItem[]): ShopItem[] {
  const rank = (c: ShopCategory | null) => (c ? SHOP_CATEGORIES.indexOf(c) : 0)
  return [...items].sort((a, b) => rank(a.category) - rank(b.category) || a.sort_order - b.sort_order || a.id - b.id)
}
