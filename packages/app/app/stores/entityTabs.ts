import { defineStore } from 'pinia'
import type { EntityPreviewType } from '~/components/shared/EntityPreviewDialog.vue'

/**
 * Entry tabs: entities opened with the eye button sit as tabs in a side panel
 * that stays open on every page, so the DM can click between them quickly.
 *
 * Tabs belong to one campaign and are remembered per campaign in this browser
 * (light convenience only — losing them just means an empty panel).
 */
export interface EntityTab {
  type: EntityPreviewType
  id: number
  name: string
}

/** Most tabs kept open; opening one more drops the oldest that isn't active. */
const MAX_TABS = 20
const STORAGE_PREFIX = 'dmhero.entityTabs.'

export function entityTabKey(tab: Pick<EntityTab, 'type' | 'id'>): string {
  return `${tab.type}:${tab.id}`
}

/** Entity-type names from the database ("NPC", "Location", …) → tab type. */
export function toPreviewType(entityType: string | null | undefined): EntityPreviewType | null {
  const t = (entityType ?? '').toLowerCase()
  return (['npc', 'location', 'item', 'faction', 'lore', 'player'] as const).find(x => x === t) ?? null
}

interface Saved { tabs: EntityTab[], activeKey: string | null, open: boolean, wide: boolean }

export const useEntityTabsStore = defineStore('entityTabs', {
  state: () => ({
    tabs: [] as EntityTab[],
    activeKey: null as string | null,
    panelOpen: false,
    wide: false,
    campaignId: null as number | null,
  }),

  getters: {
    activeTab: state => state.tabs.find(t => entityTabKey(t) === state.activeKey) ?? null,
    count: state => state.tabs.length,
  },

  actions: {
    /** Load the saved tabs for a campaign (call when the active campaign changes). */
    useCampaign(campaignId: number | null) {
      if (this.campaignId === campaignId) return
      this.campaignId = campaignId
      this.tabs = []
      this.activeKey = null
      this.panelOpen = false
      if (!campaignId) return
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + campaignId)
        if (!raw) return
        const saved = JSON.parse(raw) as Partial<Saved>
        this.tabs = Array.isArray(saved.tabs)
          ? saved.tabs.filter(t => toPreviewType(t?.type) && Number.isFinite(t?.id)).slice(0, MAX_TABS)
          : []
        this.activeKey = this.tabs.some(t => entityTabKey(t) === saved.activeKey) ? saved.activeKey! : (this.tabs[0] ? entityTabKey(this.tabs[0]) : null)
        this.panelOpen = !!saved.open && this.tabs.length > 0
        this.wide = !!saved.wide
      }
      catch {
        // storage blocked or unreadable — start empty
      }
    },

    save() {
      if (!this.campaignId) return
      try {
        const data: Saved = { tabs: this.tabs, activeKey: this.activeKey, open: this.panelOpen, wide: this.wide }
        localStorage.setItem(STORAGE_PREFIX + this.campaignId, JSON.stringify(data))
      }
      catch {
        // storage blocked — tabs still work for this visit
      }
    },

    /** Open (or switch to) an entity's tab and show the panel. */
    open(type: EntityPreviewType, id: number, name?: string) {
      const key = entityTabKey({ type, id })
      const existing = this.tabs.find(t => entityTabKey(t) === key)
      if (existing) {
        if (name) existing.name = name
      }
      else {
        this.tabs.push({ type, id, name: name ?? '' })
        while (this.tabs.length > MAX_TABS) {
          const dropAt = this.tabs.findIndex(t => entityTabKey(t) !== key)
          this.tabs.splice(dropAt, 1)
        }
      }
      this.activeKey = key
      this.panelOpen = true
      this.save()
    },

    activate(key: string) {
      if (!this.tabs.some(t => entityTabKey(t) === key)) return
      this.activeKey = key
      this.save()
    },

    /** Keep the tab label in sync once the entity has loaded (renames included). */
    rename(type: EntityPreviewType, id: number, name: string) {
      const tab = this.tabs.find(t => t.type === type && t.id === id)
      if (tab && tab.name !== name) {
        tab.name = name
        this.save()
      }
    },

    close(key: string) {
      const i = this.tabs.findIndex(t => entityTabKey(t) === key)
      if (i === -1) return
      this.tabs.splice(i, 1)
      if (this.activeKey === key) {
        const next = this.tabs[i] ?? this.tabs[i - 1] ?? null
        this.activeKey = next ? entityTabKey(next) : null
      }
      if (this.tabs.length === 0) this.panelOpen = false
      this.save()
    },

    closeAll() {
      this.tabs = []
      this.activeKey = null
      this.panelOpen = false
      this.save()
    },

    setPanelOpen(open: boolean) {
      this.panelOpen = open && this.tabs.length > 0
      this.save()
    },

    toggleWide() {
      this.wide = !this.wide
      this.save()
    },
  },
})
