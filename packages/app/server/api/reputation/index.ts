import { dispatchSubRoute } from '../../utils/subRouter'
import { reputationRoutes } from './[...path]'

/** /api/reputation itself; the catch-all doesn't match the bare path. */
export default defineEventHandler(event => dispatchSubRoute(event, reputationRoutes, ''))
