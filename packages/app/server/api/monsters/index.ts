import { dispatchSubRoute } from '../../utils/subRouter'
import { monsterRoutes } from './[...path]'

/** /api/monsters itself; the catch-all doesn't match the bare path. */
export default defineEventHandler(event => dispatchSubRoute(event, monsterRoutes, ''))
