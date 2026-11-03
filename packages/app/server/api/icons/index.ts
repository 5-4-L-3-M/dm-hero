import { dispatchSubRoute } from '../../utils/subRouter'
import { iconRoutes } from './[...path]'

export default defineEventHandler(event => dispatchSubRoute(event, iconRoutes, ''))
