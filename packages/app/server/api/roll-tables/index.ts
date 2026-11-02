import { dispatchSubRoute } from '../../utils/subRouter'
import { rollTableRoutes } from './[...path]'

/** /api/roll-tables itself; the catch-all doesn't match the bare path. */
export default defineEventHandler(event => dispatchSubRoute(event, rollTableRoutes, ''))
