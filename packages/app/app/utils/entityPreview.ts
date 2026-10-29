import { defineAsyncComponent } from 'vue'
import type { EntityPreviewType } from '~/components/shared/EntityPreviewDialog.vue'

/** Icon, colour, API endpoint and page route per previewable entity type. */
export const ENTITY_PREVIEW_CONFIG: Record<
  EntityPreviewType,
  { icon: string, color: string, endpoint: string, route: string }
> = {
  npc: { icon: 'mdi-account', color: 'blue', endpoint: '/api/npcs', route: '/npcs' },
  location: { icon: 'mdi-map-marker', color: 'green', endpoint: '/api/locations', route: '/locations' },
  item: { icon: 'mdi-sword', color: 'amber', endpoint: '/api/items', route: '/items' },
  faction: { icon: 'mdi-flag', color: 'purple', endpoint: '/api/factions', route: '/factions' },
  lore: { icon: 'mdi-book-open-variant', color: 'orange', endpoint: '/api/lore', route: '/lore' },
  player: { icon: 'mdi-account-star', color: 'pink', endpoint: '/api/players', route: '/players' },
}

/** "Open full": each type's full dialog (every tab, editing) and its id prop. */
export const ENTITY_FULL_DIALOGS: Record<EntityPreviewType, { component: ReturnType<typeof defineAsyncComponent>, idProp: string }> = {
  npc: { component: defineAsyncComponent(() => import('~/components/npcs/NpcEditDialog.vue')), idProp: 'npcId' },
  location: { component: defineAsyncComponent(() => import('~/components/locations/LocationEditDialog.vue')), idProp: 'locationId' },
  item: { component: defineAsyncComponent(() => import('~/components/items/ItemEditDialog.vue')), idProp: 'itemId' },
  faction: { component: defineAsyncComponent(() => import('~/components/factions/FactionEditDialog.vue')), idProp: 'factionId' },
  lore: { component: defineAsyncComponent(() => import('~/components/lore/LoreEditDialog.vue')), idProp: 'loreId' },
  player: { component: defineAsyncComponent(() => import('~/components/players/PlayerEditDialog.vue')), idProp: 'playerId' },
}

/** Page link that shows + highlights the entity ("Go to page"). */
export function entityPageLink(type: EntityPreviewType, id: number, name: string): string {
  return `${ENTITY_PREVIEW_CONFIG[type].route}?search=${encodeURIComponent(name)}&highlight=${id}`
}
