import { dispatchSubRoute } from '../../utils/subRouter'
import { rosterRoutes } from './[...path]'

/** /api/roster itself; the catch-all doesn't match the bare path. */
export default defineEventHandler(event => dispatchSubRoute(event, rosterRoutes, ''))
