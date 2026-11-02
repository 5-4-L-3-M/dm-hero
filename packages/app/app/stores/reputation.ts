import { defineStore } from 'pinia'
import type { RepEvent, RepKind, RepRipple, RepTrack, Reputation } from '~~/types/reputation'

/** Reputation for the active campaign — one copy, so the side panel and the World tab stay in sync. */
export const useReputationStore = defineStore('reputation', {
  state: () => ({
    campaignId: null as number | null,
    tracks: [] as RepTrack[],
    met: [] as Array<{ id: number, name: string }>,
    /** Bumped on every change so open logs reload */
    version: 0,
  }),

  getters: {
    tracksOf: state => (subjectId: number, kind: RepKind = 'rep') =>
      state.tracks.filter(t => t.subject_id === subjectId && t.kind === kind).sort((a, b) => a.player_id - b.player_id),
    isMet: state => (npcId: number) => state.met.some(m => m.id === npcId),
  },

  actions: {
    async load(campaignId: number | null, force = false) {
      if (!campaignId) return
      if (this.campaignId === campaignId && !force && this.version) return
      this.campaignId = campaignId
      const r = await $fetch<Reputation>('/api/reputation', { query: { campaignId } })
      this.tracks = r.tracks
      this.met = r.met
      this.version++
    },
    reload() {
      return this.load(this.campaignId, true)
    },
    events(subjectId: number, playerId?: number, kind?: RepKind) {
      return $fetch<RepEvent[]>('/api/reputation/events', { query: { campaignId: this.campaignId, subjectId, playerId, kind } })
    },
    ripples(subjectId: number, delta: number, kind: RepKind = 'rep') {
      return $fetch<RepRipple[]>('/api/reputation/ripples', { query: { campaignId: this.campaignId, subjectId, delta, kind } })
    },
    async log(input: { subject_id: number, delta: number, player_id?: number, kind?: RepKind, reason?: string | null, preset?: string | null, session_id?: number | null, ripples?: Array<{ subject_id: number, delta: number }> }) {
      const r = await $fetch<{ id: number, reactions: string[] }>('/api/reputation/events', { method: 'POST', body: { campaignId: this.campaignId, ...input } })
      await this.reload()
      // The world may have dropped sparks on the board
      if (r.reactions.length) useStoryBoardStore().reload()
      return r
    },
    async removeEvent(id: number) {
      await $fetch(`/api/reputation/events/${id}`, { method: 'DELETE' })
      await this.reload()
    },
    async addTrack(subjectId: number, playerId = 0, kind: RepKind = 'rep') {
      await $fetch('/api/reputation/tracks', { method: 'POST', body: { campaignId: this.campaignId, subject_id: subjectId, player_id: playerId, kind } })
      await this.reload()
    },
    async removeTrack(subjectId: number, playerId = 0, kind: RepKind = 'rep') {
      await $fetch('/api/reputation/tracks', { method: 'DELETE', query: { campaignId: this.campaignId, subjectId, playerId, kind } })
      await this.reload()
    },
    async setMet(npcId: number, met: boolean) {
      await $fetch('/api/reputation/met', { method: 'POST', body: { campaignId: this.campaignId, npc_id: npcId, met } })
      await this.reload()
    },
    async advance() {
      const turn = await $fetch<{ agendas: Array<{ faction: string, goal: string, filled: number, size: number, done: boolean }>, cooled: Array<{ place: string, notoriety: number }>, sparks: number }>('/api/reputation/advance', { method: 'POST', body: { campaignId: this.campaignId } })
      await this.reload()
      useStoryBoardStore().reload()
      return turn
    },
  },
})
