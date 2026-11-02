import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import * as roster from '../../handlers/roster/index'

/** NPC roster API: /api/roster/… (see server/handlers/roster). */
export const rosterRoutes: SubRoutes = {
  '': { GET: roster.getRoster },
  'places': { POST: roster.addPlace },
  'places/:id': { PATCH: roster.updatePlace, DELETE: roster.removePlace },
  'roles': { POST: roster.addRole },
  'roles/:id': { PATCH: roster.updateRole, DELETE: roster.removeRole },
  'order': { POST: roster.saveOrder },
}

export default defineEventHandler(event => dispatchSubRoute(event, rosterRoutes, getRouterParam(event, 'path') ?? ''))
