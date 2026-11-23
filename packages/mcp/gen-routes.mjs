import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Build-time list of every DM Hero API route, so the AI connector can reach
 * anything in the app (api_request) without a dedicated tool per feature.
 * File routes come from the server/api tree; catch-all features ([...path].ts)
 * are read from their SubRoutes tables. Body hints are best-effort: the keys a
 * handler destructures from its body / readBody<{…}> type.
 */
const here = dirname(fileURLToPath(import.meta.url))
const apiDir = resolve(here, '../app/server/api')
const METHODS = ['get', 'post', 'put', 'patch', 'delete']

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : n.endsWith('.ts') ? [p] : []
  })
}

const clean = s => s.replace(/\s+/g, ' ').trim().slice(0, 240)
function bodyHint(text) {
  const typed = text.match(/readBody<\s*(\{[^>]{0,400}?\})\s*>/)
  if (typed) return clean(typed[1])
  const destructured = text.match(/const\s*\{([^}]{1,300})\}\s*=\s*(?:await\s+readBody\([^)]*\)|body)\b/)
  return destructured ? clean(`{ ${destructured[1]} }`) : undefined
}
function queryHint(text) {
  const keys = new Set()
  for (const m of text.matchAll(/getQuery\(event\)(?:\s+as\s+[^\n]+)?\)?\.(\w+)/g)) keys.add(m[1])
  for (const m of text.matchAll(/\b(?:q|query)\.(\w+)/g)) keys.add(m[1])
  const d = text.match(/const\s*\{([^}]{1,200})\}\s*=\s*getQuery\(event\)/)
  if (d) d[1].split(',').map(s => s.split(':')[0].split('=')[0].trim()).filter(Boolean).forEach(k => keys.add(k))
  return keys.size ? [...keys].join(', ') : undefined
}

const routes = []
for (const file of walk(apiDir)) {
  const rel = relative(apiDir, file).replace(/\\/g, '/').replace(/\.ts$/, '')
  const text = readFileSync(file, 'utf8')
  if (rel.endsWith('[...path]')) {
    const base = `/api/${rel.replace(/\/?\[\.\.\.path\]$/, '')}`
    // the file itself plus any imported *Routes util (spread into the table)
    const sources = [text]
    for (const m of text.matchAll(/from\s+'(\.\.\/\.\.\/utils\/\w*Routes)'/g)) {
      const p = resolve(dirname(file), `${m[1]}.ts`)
      if (existsSync(p)) sources.push(readFileSync(p, 'utf8'))
    }
    for (const src of sources) {
      const lines = src.split('\n')
      const starts = []
      lines.forEach((l, i) => {
        const m = l.match(/^ {2}'([^']*)':\s*\{/)
        if (m) starts.push({ i, pattern: m[1] })
      })
      starts.forEach((s, k) => {
        const seg = lines.slice(s.i, starts[k + 1]?.i ?? lines.length).join('\n')
        const methods = [...new Set([...seg.matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\s*:/g)].map(m => m[1]))]
        const path = s.pattern ? `${base}/${s.pattern}` : base
        for (const method of methods) routes.push({ method, path, body: method === 'GET' || method === 'DELETE' ? undefined : bodyHint(seg), query: queryHint(seg) })
      })
    }
    continue
  }
  const parts = rel.split('/')
  const last = parts.pop()
  const m = last.match(/^(.*?)(?:\.(get|post|put|patch|delete))?$/)
  const name = m[1]
  const method = (m[2] ?? 'any').toUpperCase()
  if (name !== 'index') parts.push(name)
  const path = `/api/${parts.join('/')}`.replace(/\[(\w+)\]/g, ':$1').replace(/\/$/, '')
  routes.push({ method, path, body: METHODS.slice(1).includes(m[2] ?? '') && m[2] !== 'delete' ? bodyHint(text) : undefined, query: queryHint(text) })
}

routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
const out = routes.map(r => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)))
writeFileSync(join(here, 'src/routes.generated.json'), `${JSON.stringify(out, null, 1)}\n`)
console.log(`gen-routes: ${out.length} API routes`)
