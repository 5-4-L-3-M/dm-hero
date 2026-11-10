import { dispatchSubRoute } from '../../utils/subRouter'
import { dmReferenceRoutes } from './[...path]'

/** /api/dm-reference itself; the catch-all doesn't match the bare path. */
export default defineEventHandler(event => dispatchSubRoute(event, dmReferenceRoutes, ''))
