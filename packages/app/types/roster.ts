import type { NpcLoyalty } from './npc'

/** A place on the roster, under the DM's own category heading ("Shops & Services") */
export interface RosterPlace {
  location_id: number
  /** A place, or a faction (guilds and groups without a building) */
  kind: 'Location' | 'Faction'
  name: string
  image_url: string | null
  /** Location type key (shop, tavern …) */
  type: string | null
  category: string | null
  sort_order: number
  /** Nearest city / town / village above it (or the top place), for the settlement tabs */
  settlement_id: number | null
  settlement_name: string | null
}

export interface RosterNpc {
  id: number
  name: string
  image_url: string | null
  race: string | null
  age: number | null
  age_human: string | null
  loyalty: NpcLoyalty | null
}

/** One role at a place — filled by an NPC, or open (npc = null) */
export interface RosterRole {
  id: number
  location_id: number
  location_name: string
  role: string
  note: string | null
  sort_order: number
  npc: RosterNpc | null
}

export interface Roster {
  places: RosterPlace[]
  roles: RosterRole[]
}

/** Starter roles by location type; anything else gets the general three */
export const ROLE_TEMPLATES: Record<string, string[]> = {
  shop: ['Owner/Shopkeeper', 'Apprentice'],
  market: ['Owner/Shopkeeper', 'Apprentice'],
  smithy: ['Master Smith', 'Apprentice'],
  tavern: ['Owner', 'Barkeep', 'Server', 'Regular'],
  inn: ['Owner', 'Barkeep', 'Server', 'Regular'],
  guild: ['Leader', 'Second', 'Member'],
  temple: ['High Priest', 'Acolyte', 'Worshipper'],
  shrine: ['Keeper', 'Worshipper'],
  academy: ['Headmaster', 'Teacher', 'Student'],
  library: ['Head Librarian', 'Scribe'],
  barracks: ['Commander', 'Officer', 'Guard'],
  palace: ['Ruler', 'Steward', 'Servant'],
  manor: ['Lord/Lady', 'Steward', 'Servant'],
}
export const DEFAULT_ROLES = ['Owner', 'Employee', 'Regular']

export const SETTLEMENT_TYPES = ['city', 'town', 'village']
