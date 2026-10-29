import { dispatchSubRoute } from '../../utils/subRouter'
import { questRoutes } from './[...path]'

/** /api/quests itself (list + create); the catch-all doesn't match the bare path. */
export default defineEventHandler(event => dispatchSubRoute(event, questRoutes, ''))
