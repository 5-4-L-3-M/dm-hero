// Place categories: the DM's own groups of places (colour + icon) for map pins and roster headings.

export interface PlaceCategory {
  id: number
  name: string
  color: string
  icon: string
  sort_order: number
}

export interface PlaceCategories {
  categories: PlaceCategory[]
  /** location id → its category (set by hand, or guessed from the location type) */
  locations: Array<{ id: number, category_id: number | null, explicit: boolean }>
}

/** Starting categories for a campaign, and which location types they take in */
export const DEFAULT_PLACE_CATEGORIES: Array<{ name: string, color: string, icon: string, types: string[] }> = [
  { name: 'Settlements', color: '#8E7CC3', icon: 'mdi-city', types: ['city', 'town', 'village', 'district'] },
  { name: 'Shops & Services', color: '#E06666', icon: 'mdi-storefront', types: ['shop', 'market', 'smithy', 'warehouse'] },
  { name: 'Inns & Taverns', color: '#F6B26B', icon: 'mdi-glass-mug-variant', types: ['tavern', 'inn'] },
  { name: 'Institutions & Government', color: '#6FA8DC', icon: 'mdi-bank', types: ['castle', 'palace', 'throne_room', 'barracks', 'prison', 'fortress', 'academy', 'library', 'manor', 'harbor', 'lighthouse'] },
  { name: 'Temples & Shrines', color: '#FFD966', icon: 'mdi-candle', types: ['temple', 'shrine', 'monastery', 'graveyard', 'crypt'] },
  { name: 'Guilds & Factions', color: '#93C47D', icon: 'mdi-shield-account', types: ['guild'] },
  { name: 'Parks and Recreation', color: '#76A5AF', icon: 'mdi-flower', types: ['arena', 'monument', 'waterfall'] },
  { name: 'Wilds', color: '#6AA84F', icon: 'mdi-pine-tree', types: ['forest', 'mountain', 'river', 'lake', 'swamp', 'desert', 'island', 'valley', 'coast', 'oasis', 'glacier', 'volcano', 'canyon', 'plains', 'jungle', 'road', 'bridge', 'farm', 'windmill', 'quarry'] },
  { name: 'Dungeons & Ruins', color: '#999999', icon: 'mdi-skull', types: ['dungeon', 'cave', 'ruins', 'mine', 'sewers', 'underground', 'portal', 'battlefield', 'camp'] },
]
