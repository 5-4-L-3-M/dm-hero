import { defineStore } from 'pinia'
import type { DashboardBoardKey, DashboardCard } from '~~/types/dashboard'

/** The DM's two arrangeable dashboards (at the table / prep), saved per campaign. */
export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    campaignId: null as number | null,
    layouts: {} as Partial<Record<DashboardBoardKey, DashboardCard[]>>,
  }),

  actions: {
    async load(campaignId: number | null, board: DashboardBoardKey, force = false) {
      if (!campaignId) return
      if (this.campaignId !== campaignId) {
        this.campaignId = campaignId
        this.layouts = {}
      }
      if (this.layouts[board] && !force) return
      this.layouts[board] = await $fetch<DashboardCard[]>('/api/dashboard', { query: { campaignId, board } })
    },
    async save(board: DashboardBoardKey, layout: DashboardCard[]) {
      if (!this.campaignId) return
      this.layouts[board] = layout
      await $fetch('/api/dashboard', { method: 'PUT', body: { campaignId: this.campaignId, board, layout } })
    },
    async reset(board: DashboardBoardKey) {
      if (!this.campaignId) return
      this.layouts[board] = await $fetch<DashboardCard[]>('/api/dashboard', { method: 'DELETE', query: { campaignId: this.campaignId, board } })
    },
  },
})
