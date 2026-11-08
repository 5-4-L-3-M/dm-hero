import { timingSafeEqual } from 'node:crypto'

/**
 * Passphrase gate for hosted (web) installs.
 *
 * Off unless DM_HERO_PASSPHRASE is set, so the desktop app is unaffected.
 * Uses the browser's built-in sign-in prompt (HTTP Basic auth): any user
 * name, the passphrase as the password. The browser remembers it per site.
 * Requests from the machine itself (the container health check) skip it.
 */
export default defineEventHandler((event) => {
  const passphrase = process.env.DM_HERO_PASSPHRASE
  if (!passphrase) return

  const remote = event.node.req.socket?.remoteAddress || ''
  if (remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1') return

  const header = getRequestHeader(event, 'authorization') || ''
  if (header.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
    const given = decoded.slice(decoded.indexOf(':') + 1)
    if (safeEqual(given, passphrase)) return
  }

  setResponseHeader(event, 'WWW-Authenticate', 'Basic realm="DM Hero", charset="UTF-8"')
  throw createError({ statusCode: 401, statusMessage: 'Passphrase required' })
})

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
