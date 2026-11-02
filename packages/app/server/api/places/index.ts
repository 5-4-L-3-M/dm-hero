import { dispatchSubRoute } from '../../utils/subRouter'
import { placesRoutes } from './[...path]'

/** /api/places itself; the catch-all doesn't match the bare path. */
export default defineEventHandler(event => dispatchSubRoute(event, placesRoutes, ''))
