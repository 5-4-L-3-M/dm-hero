import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import * as places from '../../handlers/places'

/** Place categories API: /api/places/… (see server/handlers/places). */
export const placesRoutes: SubRoutes = {
  '': { GET: places.getPlaces },
  'categories': { POST: places.addCategory },
  'categories/:id': { PATCH: places.updateCategory, DELETE: places.removeCategory },
  'location': { PUT: places.setLocation },
}

export default defineEventHandler(event => dispatchSubRoute(event, placesRoutes, getRouterParam(event, 'path') ?? ''))
