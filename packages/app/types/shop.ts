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
  /** Under the counter: listed in the shop's black market */
  secret: boolean
  /** What it takes to buy it, in your words ("Thieves Guild contact") */
  requirement: string | null
  /** Optional reputation lock: this NPC / faction / place must feel at least req_tier */
  req_subject_id: number | null
  req_tier: string | null
  req_subject_name: string | null
  req_subject_type: 'NPC' | 'Faction' | 'Location' | null
  /** Whether the party (or one of its players) meets the reputation lock; null = no lock */
  req_met: boolean | null
  /** Icon picked for it (game-icons.net name); null = guessed from the name */
  icon: string | null
  /** The icon shown: the picked one or the guess */
  icon_shown: string
  /** The linked item's own picture, shown instead of an icon when there is one */
  item_image: string | null
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
  secret?: boolean
  requirement?: string | null
  req_subject_id?: number | null
  req_tier?: string | null
  icon?: string | null
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
