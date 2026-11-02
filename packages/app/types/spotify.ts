// Spotify remote: DM Hero tells the Spotify app (desktop, phone …) what to play.

export const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
]

export interface SpotifyStatus {
  /** A Client ID from the DM's own Spotify developer app is saved */
  configured: boolean
  connected: boolean
  user: string | null
  /** Where Spotify must send you back (register exactly this on the developer app) */
  redirectUri: string
}

export interface SpotifyItem {
  uri: string
  name: string
  /** playlist | album | track | artist */
  kind: string
  subtitle: string | null
  image: string | null
}

export interface SpotifyPlayback {
  active: boolean
  playing: boolean
  track: string | null
  artist: string | null
  image: string | null
  device: string | null
  volume: number | null
  shuffle: boolean
  /** What it's playing from (a playlist / album uri) */
  context: string | null
  progressMs: number
  durationMs: number
}

export interface SpotifyDevice {
  id: string
  name: string
  type: string
  active: boolean
  volume: number | null
}

/** A one-click mood button for the campaign ("Tavern", "Combat" …) */
export interface SpotifyScene {
  id: number
  name: string
  uri: string
  kind: string
  image: string | null
  sort_order: number
}
