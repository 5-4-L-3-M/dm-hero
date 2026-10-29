import { defineStore } from 'pinia'
import type {
  LinkedEntity, Quest, StoryBeat, StoryBoard, StoryBoardSettings, StoryCluster, StoryLine,
} from '~~/types/story'
import { nearbyLocationIds } from '~~/types/story'

/**
 * Story Board state for the active campaign: storylines, clusters, beats
 * (the sparks shelf = beats without a cluster, the tray = beats with a
 * tray_order), quests and the linkable entries. Changes are saved straight
 * away; the board reloads after anything that moves several rows.
 */
export const useStoryBoardStore = defineStore('storyBoard', {
  state: () => ({
    campaignId: null as number | null,
    loading: false,
    board: null as StoryBoard | null,
    entities: [] as LinkedEntity[],
    locations: [] as { id: number, name: string, parent_id: number | null }[],
    quests: [] as Quest[],
    /** Bumped whenever a quest is saved, so open side-panel tabs reload */
    questVersion: 0,
  }),

  getters: {
    storylines: s => s.board?.storylines ?? [],
    clusters: s => s.board?.clusters ?? [],
    beats: s => s.board?.beats ?? [],
    settings: (s): StoryBoardSettings => s.board?.settings ?? { color_by: 'storyline', party_location_id: null, group_by: 'storyline', compact: false },
    sparks(): StoryBeat[] {
      return this.beats.filter(b => b.cluster_id === null)
    },
    tray(): StoryBeat[] {
      return this.beats.filter(b => b.tray_order !== null).sort((a, b) => a.tray_order! - b.tray_order!)
    },
    nearby(): Set<number> {
      return nearbyLocationIds(this.settings.party_location_id, this.locations)
    },
  },

  actions: {
    async load(campaignId: number | null, force = false) {
      if (!campaignId) {
        this.campaignId = null
        this.board = null
        return
      }
      if (this.campaignId === campaignId && this.board && !force) return
      this.campaignId = campaignId
      this.loading = true
      try {
        const [board, linkable, quests] = await Promise.all([
          $fetch<StoryBoard>('/api/story/board', { query: { campaignId } }),
          $fetch<{ entities: LinkedEntity[], locations: { id: number, name: string, parent_id: number | null }[] }>('/api/story/entities', { query: { campaignId } }),
          $fetch<Quest[]>('/api/quests', { query: { campaignId } }),
        ])
        if (this.campaignId !== campaignId) return
        this.board = board
        this.entities = linkable.entities
        this.locations = linkable.locations
        this.quests = quests
      }
      finally {
        this.loading = false
      }
    },

    async reload() {
      if (this.campaignId) await this.load(this.campaignId, true)
    },

    beatsOf(clusterId: number): StoryBeat[] {
      return this.beats.filter(b => b.cluster_id === clusterId)
    },

    // --- settings -------------------------------------------------------
    async saveSettings(changes: Partial<StoryBoard['settings']>) {
      if (!this.board || !this.campaignId) return
      Object.assign(this.board.settings, changes)
      this.board.settings = await $fetch<StoryBoard['settings']>('/api/story/settings', { method: 'PATCH', body: { campaignId: this.campaignId, ...changes } })
    },

    // --- storylines ------------------------------------------------------
    async addStoryline(name: string, color?: number) {
      const line = await $fetch<StoryLine>('/api/story/storylines', { method: 'POST', body: { campaignId: this.campaignId, name, color } })
      this.board?.storylines.push(line)
      return line
    },
    async updateStoryline(id: number, changes: Partial<StoryLine>) {
      const line = await $fetch<StoryLine>(`/api/story/storylines/${id}`, { method: 'PATCH', body: changes })
      const i = this.storylines.findIndex(s => s.id === id)
      if (i >= 0 && this.board) this.board.storylines[i] = line
    },
    async deleteStoryline(id: number) {
      await $fetch(`/api/story/storylines/${id}`, { method: 'DELETE' })
      await this.reload()
    },

    // --- clusters --------------------------------------------------------
    async addCluster(data: Partial<StoryCluster>) {
      const cluster = await $fetch<StoryCluster>('/api/story/clusters', { method: 'POST', body: { campaignId: this.campaignId, ...data } })
      this.board?.clusters.push(cluster)
      return cluster
    },
    async updateCluster(id: number, changes: Partial<StoryCluster>) {
      const local = this.clusters.find(c => c.id === id)
      if (local) Object.assign(local, changes)
      const cluster = await $fetch<StoryCluster>(`/api/story/clusters/${id}`, { method: 'PATCH', body: changes })
      const i = this.clusters.findIndex(c => c.id === id)
      if (i >= 0 && this.board) this.board.clusters[i] = cluster
    },
    async deleteCluster(id: number, withBeats = false) {
      await $fetch(`/api/story/clusters/${id}`, { method: 'DELETE', query: { withBeats } })
      await this.reload()
    },

    // --- beats -----------------------------------------------------------
    async addBeat(data: Partial<StoryBeat> & { entity_ids?: number[], in_tray?: boolean }) {
      const beat = await $fetch<StoryBeat>('/api/story/beats', { method: 'POST', body: { campaignId: this.campaignId, ...data } })
      this.board?.beats.push(beat)
      return beat
    },
    async updateBeat(id: number, changes: Partial<StoryBeat> & { entity_ids?: number[], in_tray?: boolean }) {
      const beat = await $fetch<StoryBeat>(`/api/story/beats/${id}`, { method: 'PATCH', body: changes })
      const i = this.beats.findIndex(b => b.id === id)
      if (i >= 0 && this.board) this.board.beats[i] = beat
      return beat
    },
    async deleteBeat(id: number) {
      await $fetch(`/api/story/beats/${id}`, { method: 'DELETE' })
      if (this.board) this.board.beats = this.board.beats.filter(b => b.id !== id)
    },

    /** Save drag & drop: new beat order per list (null = sparks), cluster order, tray order. */
    async saveOrder(order: { clusters?: number[], lists?: { clusterId: number | null, beatIds: number[] }[], tray?: number[] }) {
      if (!this.board) return
      // Apply locally first so the board doesn't jump back
      for (const list of order.lists ?? []) {
        list.beatIds.forEach((id, i) => {
          const b = this.beats.find(x => x.id === id)
          if (b) {
            b.cluster_id = list.clusterId
            b.sort_order = i
          }
        })
      }
      order.clusters?.forEach((id, i) => {
        const c = this.clusters.find(x => x.id === id)
        if (c) c.sort_order = i
      })
      if (order.tray) {
        for (const b of this.beats) {
          const i = order.tray.indexOf(b.id)
          b.tray_order = i >= 0 ? i : null
        }
      }
      this.board.beats.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      this.board.clusters.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      await $fetch('/api/story/order', { method: 'POST', body: { campaignId: this.campaignId, ...order } })
    },

    // --- quests ----------------------------------------------------------
    async loadQuests() {
      if (!this.campaignId) return
      this.quests = await $fetch<Quest[]>('/api/quests', { query: { campaignId: this.campaignId } })
    },
    async saveQuest(id: number | null, data: Partial<Quest>) {
      const quest = id
        ? await $fetch<Quest>(`/api/quests/${id}`, { method: 'PATCH', body: data })
        : await $fetch<Quest>('/api/quests', { method: 'POST', body: { campaignId: this.campaignId, ...data } })
      const i = this.quests.findIndex(q => q.id === quest.id)
      if (i >= 0) this.quests[i] = quest
      else this.quests.push(quest)
      if (!id) this.entities.push({ id: quest.id, name: quest.name, type: 'Quest' })
      this.questVersion++
      return quest
    },
    async deleteQuest(id: number) {
      await $fetch(`/api/quests/${id}`, { method: 'DELETE' })
      this.quests = this.quests.filter(q => q.id !== id)
      this.entities = this.entities.filter(e => e.id !== id)
    },
  },
})
