import { defineStore } from 'pinia'
import type { EntityPreviewType } from '~/components/shared/EntityPreviewDialog.vue'

/**
 * One app-wide quick-preview popup for clickable entry names that sit inside a
 * dialog (inventories, relation lists …). Outside dialogs, names open straight
 * into the entry-tabs side panel instead.
 */
export const useEntityPeekStore = defineStore('entityPeek', {
  state: () => ({
    open: false,
    type: 'npc' as EntityPreviewType,
    id: null as number | null,
  }),

  actions: {
    show(type: EntityPreviewType, id: number) {
      this.type = type
      this.id = id
      this.open = true
    },
  },
})
