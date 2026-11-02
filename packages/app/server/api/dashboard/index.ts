import { dispatchSubRoute } from '../../utils/subRouter'
import { dashboardRoutes } from './[...path]'

/** /api/dashboard itself; the catch-all doesn't match the bare path. */
export default defineEventHandler(event => dispatchSubRoute(event, dashboardRoutes, ''))
