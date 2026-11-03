import { dispatchSubRoute, type SubRoutes } from '../../utils/subRouter'
import { loadIconSet, searchIcons } from '../../utils/gameIcons'

/**
 * Item icons (game-icons.net, CC BY 3.0):
 *   GET /api/icons?names=a,b        → { size, icons: { a: '<path …/>' } } (unknown names left out)
 *   GET /api/icons/search?q=sword   → ['broadsword', …]
 */
export const iconRoutes: SubRoutes = {
  '': {
    GET: defineEventHandler(async (event) => {
      const set = await loadIconSet()
      const wanted = String(getQuery(event).names ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 300)
      const icons: Record<string, string> = {}
      for (const n of wanted) if (set.icons[n]) icons[n] = set.icons[n]
      setHeader(event, 'Cache-Control', 'public, max-age=86400')
      return { size: set.width, icons }
    }),
  },
  'search': {
    GET: defineEventHandler(async (event) => {
      await loadIconSet()
      const q = getQuery(event)
      return searchIcons(String(q.q ?? ''), Math.min(300, Number(q.limit) || 120))
    }),
  },
}

export default defineEventHandler(event => dispatchSubRoute(event, iconRoutes, getRouterParam(event, 'path') ?? ''))
