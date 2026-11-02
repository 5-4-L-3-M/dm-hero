import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import * as rep from '../../handlers/reputation/index'

/** Reputation API: /api/reputation/… (see server/handlers/reputation). */
export const reputationRoutes: SubRoutes = {
  '': { GET: rep.getReputation },
  'events': { GET: rep.getEvents, POST: rep.addEvent },
  'events/:id': { DELETE: rep.removeEvent },
  'ripples': { GET: rep.getRipples },
  'tracks': { POST: rep.addTrack, DELETE: rep.removeTrack },
  'met': { POST: rep.markMet },
  'advance': { POST: rep.advance },
}

export default defineEventHandler(event => dispatchSubRoute(event, reputationRoutes, getRouterParam(event, 'path') ?? ''))
