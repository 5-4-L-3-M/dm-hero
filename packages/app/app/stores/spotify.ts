import { defineStore } from 'pinia'
import type { SpotifyItem, SpotifyPlayback, SpotifyScene, SpotifyStatus } from '~~/types/spotify'

/** Spotify remote for the whole app: connection, what's playing, the campaign's scenes. */
export const useSpotifyStore = defineStore('spotify', {
  state: () => ({
    status: null as SpotifyStatus | null,
    playback: null as SpotifyPlayback | null,
    scenes: [] as SpotifyScene[],
    scenesCampaign: null as number | null,
    playlists: [] as SpotifyItem[],
    error: null as string | null,
    busy: false,
    watchers: 0,
    timer: null as ReturnType<typeof setInterval> | null,
  }),

  getters: {
    connected: state => !!state.status?.connected,
  },

  actions: {
    async loadStatus() {
      this.status = await $fetch<SpotifyStatus>('/api/spotify/status').catch(() => null)
      return this.status
    },
    async saveClientId(clientId: string) {
      await $fetch('/api/spotify/config', { method: 'POST', body: { clientId } })
      await this.loadStatus()
    },
    /** Open Spotify's login in the browser, then watch for the connection to land */
    async connect() {
      const { url } = await $fetch<{ url: string }>('/api/spotify/login')
      await useElectron().openExternalUrl(url)
      for (let i = 0; i < 90 && !this.status?.connected; i++) {
        await new Promise(r => setTimeout(r, 2000))
        await this.loadStatus()
      }
      if (this.status?.connected) await Promise.all([this.refresh(), this.loadPlaylists()])
    },
    async disconnect() {
      await $fetch('/api/spotify/logout', { method: 'POST' })
      this.playback = null
      this.playlists = []
      await this.loadStatus()
    },

    async refresh() {
      if (!this.status?.connected) return
      try {
        this.playback = await $fetch<SpotifyPlayback>('/api/spotify/player')
      }
      catch {
        // a hiccup — try again on the next tick
      }
    },
    /** Components that show playback call watch()/unwatch(); polling runs while anyone watches */
    watch() {
      this.watchers++
      if (this.timer) return
      this.loadStatus().then(() => this.refresh())
      this.timer = setInterval(() => this.refresh(), 5000)
    },
    unwatch() {
      this.watchers = Math.max(0, this.watchers - 1)
      if (!this.watchers && this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },

    async command(path: string, body?: Record<string, unknown>) {
      this.busy = true
      this.error = null
      try {
        await $fetch(`/api/spotify/${path}`, { method: 'POST', body: body ?? {} })
        setTimeout(() => this.refresh(), 400)
      }
      catch (e) {
        this.error = (e as { data?: { message?: string } }).data?.message ?? (e as Error).message
        useSnackbarStore().error(this.error)
      }
      finally {
        this.busy = false
      }
    },
    play(uri?: string | null, shuffle?: boolean) {
      return this.command('play', { uri: uri ?? null, ...(typeof shuffle === 'boolean' ? { shuffle } : {}) })
    },
    togglePlay() {
      return this.playback?.playing ? this.command('pause') : this.command('play')
    },
    setVolume(percent: number) {
      if (this.playback) this.playback.volume = percent
      return this.command('volume', { percent })
    },
    setShuffle(state: boolean) {
      if (this.playback) this.playback.shuffle = state
      return this.command('shuffle', { state })
    },

    async loadPlaylists() {
      this.playlists = await $fetch<SpotifyItem[]>('/api/spotify/playlists').catch(() => [])
    },
    search(q: string) {
      return $fetch<SpotifyItem[]>('/api/spotify/search', { query: { q } })
    },

    async loadScenes(campaignId: number | null) {
      if (!campaignId) return
      this.scenesCampaign = campaignId
      this.scenes = await $fetch<SpotifyScene[]>('/api/spotify/scenes', { query: { campaignId } }).catch(() => [])
    },
    async addScene(item: SpotifyItem, name?: string) {
      this.scenes = await $fetch<SpotifyScene[]>('/api/spotify/scenes', { method: 'POST', body: { campaignId: this.scenesCampaign, name: name || item.name, uri: item.uri, kind: item.kind, image: item.image } })
    },
    async renameScene(id: number, name: string) {
      this.scenes = await $fetch<SpotifyScene[]>(`/api/spotify/scenes/${id}`, { method: 'PATCH', body: { name } })
    },
    async removeScene(id: number) {
      this.scenes = await $fetch<SpotifyScene[]>(`/api/spotify/scenes/${id}`, { method: 'DELETE' })
    },
    async orderScenes(ids: number[]) {
      this.scenes = await $fetch<SpotifyScene[]>('/api/spotify/scenes/order', { method: 'POST', body: { campaignId: this.scenesCampaign, ids } })
    },
  },
})
