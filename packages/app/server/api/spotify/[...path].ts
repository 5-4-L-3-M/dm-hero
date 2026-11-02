import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import * as s from '../../handlers/spotify'

/** Spotify remote: login, playback controls, the DM's playlists, campaign scenes */
export const spotifyRoutes: SubRoutes = {
  'status': { GET: s.status },
  'config': { POST: s.saveConfig },
  'login': { GET: s.login },
  'callback': { GET: s.callback },
  'logout': { POST: s.logout },
  'player': { GET: s.player },
  'devices': { GET: s.devices },
  'play': { POST: s.play },
  'pause': { POST: s.pause },
  'next': { POST: s.next },
  'previous': { POST: s.previous },
  'volume': { POST: s.volume },
  'shuffle': { POST: s.shuffle },
  'playlists': { GET: s.playlists },
  'search': { GET: s.search },
  'scenes': { GET: s.getScenes, POST: s.addScene },
  'scenes/order': { POST: s.orderScenes },
  'scenes/:id': { PATCH: s.updateScene, DELETE: s.deleteScene },
}

export default defineEventHandler(event => dispatchSubRoute(event, spotifyRoutes, getRouterParam(event, 'path') ?? ''))
