import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import list from '../../handlers/quests/index.get'
import create from '../../handlers/quests/index.post'
import get from '../../handlers/quests/[id].get'
import update from '../../handlers/quests/[id].patch'
import remove from '../../handlers/quests/[id].delete'

/** Quest API: /api/quests (list, create) and /api/quests/:id (see server/handlers/quests). */
export const questRoutes: SubRoutes = {
  '': { GET: list, POST: create },
  ':id': { GET: get, PATCH: update, DELETE: remove },
}

export default defineEventHandler(event => dispatchSubRoute(event, questRoutes, getRouterParam(event, 'path') ?? ''))
