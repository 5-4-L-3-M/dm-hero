import { defineStore } from 'pinia'
import type { PlaceCategories, PlaceCategory } from '~~/types/places'

/** Place categories for the active campaign (map pin colours, roster headings). */
export const usePlacesStore = defineStore('places', {
  state: () => ({
    campaignId: null as number | null,
    categories: [] as PlaceCategory[],
    locations: [] as PlaceCategories['locations'],
  }),
  getters: {
    categoryOf: state => (locationId: number): PlaceCategory | null => {
      const l = state.locations.find(x => x.id === locationId)
      return l?.category_id ? state.categories.find(c => c.id === l.category_id) ?? null : null
    },
    isExplicit: state => (locationId: number) => !!state.locations.find(x => x.id === locationId)?.explicit,
  },
  actions: {
    async load(campaignId: number | null, force = false) {
      if (!campaignId || (this.campaignId === campaignId && !force && this.categories.length)) return
      this.campaignId = campaignId
      const r = await $fetch<PlaceCategories>('/api/places', { query: { campaignId } })
      this.categories = r.categories
      this.locations = r.locations
    },
    reload() {
      return this.load(this.campaignId, true)
    },
    async setLocation(locationId: number, categoryId: number | null) {
      await $fetch('/api/places/location', { method: 'PUT', body: { campaignId: this.campaignId, location_id: locationId, category_id: categoryId } })
      await this.reload()
    },
    async addCategory(name: string, color?: string, icon?: string) {
      await $fetch('/api/places/categories', { method: 'POST', body: { campaignId: this.campaignId, name, color, icon } })
      await this.reload()
    },
    async updateCategory(id: number, changes: Partial<PlaceCategory>) {
      await $fetch(`/api/places/categories/${id}`, { method: 'PATCH', body: changes })
      await this.reload()
    },
    async removeCategory(id: number) {
      await $fetch(`/api/places/categories/${id}`, { method: 'DELETE' })
      await this.reload()
    },
  },
})
