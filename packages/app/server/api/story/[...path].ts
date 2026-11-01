import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import board from '../../handlers/story/board.get'
import settings from '../../handlers/story/settings.patch'
import entities from '../../handlers/story/entities.get'
import order from '../../handlers/story/order.post'
import storylineCreate from '../../handlers/story/storylines/index.post'
import storylineUpdate from '../../handlers/story/storylines/[id].patch'
import storylineDelete from '../../handlers/story/storylines/[id].delete'
import clusterCreate from '../../handlers/story/clusters/index.post'
import clusterUpdate from '../../handlers/story/clusters/[id].patch'
import clusterDelete from '../../handlers/story/clusters/[id].delete'
import beatCreate from '../../handlers/story/beats/index.post'
import beatUpdate from '../../handlers/story/beats/[id].patch'
import beatDelete from '../../handlers/story/beats/[id].delete'
import questlineCreate from '../../handlers/story/questlines/index.post'
import questlineUpdate from '../../handlers/story/questlines/[id].patch'
import questlineDelete from '../../handlers/story/questlines/[id].delete'
import * as storyMap from '../../handlers/story/map'
import agendaList from '../../handlers/story/agendas/index.get'
import agendaCreate from '../../handlers/story/agendas/index.post'
import agendaUpdate from '../../handlers/story/agendas/[id].patch'
import agendaDelete from '../../handlers/story/agendas/[id].delete'

/** Story Board API: /api/story/… (see server/handlers/story for each endpoint). */
const routes: SubRoutes = {
  'board': { GET: board },
  'settings': { PATCH: settings },
  'entities': { GET: entities },
  'order': { POST: order },
  'storylines': { POST: storylineCreate },
  'storylines/:id': { PATCH: storylineUpdate, DELETE: storylineDelete },
  'clusters': { POST: clusterCreate },
  'clusters/:id': { PATCH: clusterUpdate, DELETE: clusterDelete },
  'beats': { POST: beatCreate },
  'beats/:id': { PATCH: beatUpdate, DELETE: beatDelete },
  'questlines': { POST: questlineCreate },
  'questlines/:id': { PATCH: questlineUpdate, DELETE: questlineDelete },
  'map': { GET: storyMap.getMap },
  'map/nodes': { POST: storyMap.addNode },
  'map/nodes/:id': { PATCH: storyMap.moveNode, DELETE: storyMap.removeNode },
  'map/positions': { POST: storyMap.savePositions },
  'map/edges': { POST: storyMap.addEdge },
  'map/edges/:id': { PATCH: storyMap.updateEdge, DELETE: storyMap.removeEdge },
  'agendas': { GET: agendaList, POST: agendaCreate },
  'agendas/:id': { PATCH: agendaUpdate, DELETE: agendaDelete },
}

export default defineEventHandler(event => dispatchSubRoute(event, routes, getRouterParam(event, 'path') ?? ''))
