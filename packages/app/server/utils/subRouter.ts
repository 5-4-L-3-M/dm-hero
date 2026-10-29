import type { EventHandler, H3Event } from 'h3'

/**
 * A small router for a feature's API under one catch-all route file.
 *
 * Every route file adds to the typed-$fetch route union, and past a certain
 * size TypeScript gives up on unrelated $fetch calls ("Type instantiation is
 * excessively deep"). So a feature with many endpoints mounts them here
 * instead: one catch-all file, handlers kept as ordinary files elsewhere.
 *
 * Patterns are relative to the mount ("beats/:id"); ":id" ends up in the
 * router params, so the handlers read it with getRouterParam(event, 'id').
 */
export type SubRoutes = Record<string, Partial<Record<'GET' | 'POST' | 'PATCH' | 'DELETE', EventHandler>>>

export function matchSubRoute(routes: SubRoutes, method: string, path: string): { handler: EventHandler, params: Record<string, string> } | null {
  const parts = path.split('/').filter(Boolean)
  for (const [pattern, methods] of Object.entries(routes)) {
    const want = pattern.split('/').filter(Boolean)
    if (want.length !== parts.length) continue
    const params: Record<string, string> = {}
    const ok = want.every((seg, i) => {
      if (seg.startsWith(':')) {
        params[seg.slice(1)] = decodeURIComponent(parts[i]!)
        return true
      }
      return seg === parts[i]
    })
    if (!ok) continue
    const handler = methods[method as keyof typeof methods]
    if (!handler) throw createError({ statusCode: 405, message: 'Method not allowed' })
    return { handler, params }
  }
  return null
}

export async function dispatchSubRoute(event: H3Event, routes: SubRoutes, path: string) {
  const match = matchSubRoute(routes, event.method, path)
  if (!match) throw createError({ statusCode: 404, message: 'Not found' })
  event.context.params = { ...event.context.params, ...match.params }
  return await match.handler(event)
}
