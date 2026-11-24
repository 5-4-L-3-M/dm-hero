import { getDb } from './db'
import { decrypt } from './encryption'
import { ITEM_RARITIES, ITEM_TYPES } from '../../types/item'

/**
 * In-app assistant: Claude with tools over DM Hero's own API.
 *
 * Read tools run straight away. Write tools never run on their own: the loop
 * stops and hands them back to the app as "pending", and they only run after
 * the DM presses Confirm (the next request carries the decision).
 */

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5'

export interface AssistantBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
  is_error?: boolean
}
export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string | AssistantBlock[]
}
export interface PendingChange {
  id: string
  tool: string
  summary: string
}

interface ToolDef {
  name: string
  description: string
  input_schema: Record<string, unknown>
  write?: boolean
  run: (input: Record<string, unknown>, ctx: { campaignId: number }) => Promise<unknown>
}

const MAX_RESULT = 14000

async function api<T = unknown>(path: string, opts?: { method?: string, body?: unknown }): Promise<T> {
  // Plain-typed fetch: Nitro's typed route inference goes infinitely deep on a dynamic path
  const f = $fetch as unknown as (url: string, o: Record<string, unknown>) => Promise<T>
  return await f(path, { method: opts?.method ?? 'GET', body: opts?.body })
}

async function giveItem(holderId: number, itemId: number, quantity: number) {
  const c = await api<{ connections?: Array<{ relationId: number, entityId: number, relationType: string, relationNotes: unknown }> }>(`/api/entities/${holderId}/connections`)
  const rel = (c.connections ?? []).find(r => r.entityId === itemId && r.relationType === 'carries')
  if (rel) {
    const cur = rel.relationNotes && typeof rel.relationNotes === 'object' ? rel.relationNotes as Record<string, unknown> : {}
    const notes = { quantity: 1, equipped: false, ...cur }
    notes.quantity = Number(notes.quantity ?? 1) + quantity
    return api(`/api/entity-relations/${rel.relationId}`, { method: 'PATCH', body: { notes } })
  }
  return api('/api/entity-relations', { method: 'POST', body: { fromEntityId: holderId, toEntityId: itemId, relationType: 'carries', notes: { quantity, equipped: false } } })
}

const num = (v: unknown) => Number(v)
const summaryProp = { summary: { type: 'string', description: 'One plain sentence the DM reads before confirming, e.g. "Give Henry Kidd 50 GP (75 → 125)."' } }

interface BoardBeatLite { id: number, title: string, body: string | null, kind: string, status: string, location_name: string | null, tray_order: number | null, archived?: boolean, entities?: Array<{ id: number, name: string, type: string }> }

const TOOLS: ToolDef[] = [
  {
    name: 'search',
    description: 'Fuzzy search the campaign for NPCs, players, locations, items, factions, lore and quests by name or words. Returns ids and types. Start here when the DM names something.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    run: async ({ query }, { campaignId }) => {
      const rows = await api<Array<{ id: number, name: string, type: string }>>(`/api/search?q=${encodeURIComponent(String(query))}&campaignId=${campaignId}`)
      return (rows ?? []).slice(0, 15).map(r => ({ id: r.id, name: r.name, type: r.type }))
    },
  },
  {
    name: 'get_entity',
    description: 'Read one entry in full (NPC, location, item, faction, lore, player, quest): description, metadata (race, age, AC, HP …), and its links (inventory items, relations).',
    input_schema: { type: 'object', properties: { entityId: { type: 'integer' } }, required: ['entityId'] },
    run: async ({ entityId }) => {
      const [entity, relations] = await Promise.all([
        api(`/api/entities/${num(entityId)}`),
        api(`/api/entities/${num(entityId)}/connections`).catch(() => null),
      ])
      return { entity, relations }
    },
  },
  {
    name: 'list_players',
    description: 'The player characters of this campaign with their ids and sheet basics (class, AC, HP, passive perception, phobia …).',
    input_schema: { type: 'object', properties: {} },
    run: async (_i, { campaignId }) => api(`/api/players?campaignId=${campaignId}`),
  },
  {
    name: 'get_player_inventory',
    description: 'A player character\'s inventory (items, quantities, equipped, missing flags, relationIds, carried weight) and purse (coins per currency).',
    input_schema: { type: 'object', properties: { playerId: { type: 'integer' } }, required: ['playerId'] },
    run: async ({ playerId }) => {
      const [inventory, purse] = await Promise.all([
        api(`/api/players/${num(playerId)}/inventory`),
        api(`/api/players/${num(playerId)}/coins`),
      ])
      return { inventory, purse }
    },
  },
  {
    name: 'get_stat_block',
    description: 'The combat stat block of an NPC or monster entry (AC, HP, attacks, saves). null = none.',
    input_schema: { type: 'object', properties: { entityId: { type: 'integer' } }, required: ['entityId'] },
    run: async ({ entityId }) => api(`/api/monsters/npc/${num(entityId)}`),
  },
  {
    name: 'get_next_session',
    description: 'The beats planned for the next session (the next-session tray), in order, with their full text, place and linked entries.',
    input_schema: { type: 'object', properties: {} },
    run: async (_i, { campaignId }) => {
      const b = await api<{ beats: BoardBeatLite[] }>(`/api/story/board?campaignId=${campaignId}`)
      return b.beats.filter(x => x.tray_order !== null).sort((x, y) => x.tray_order! - y.tray_order!)
        .map(x => ({ id: x.id, title: x.title, status: x.status, kind: x.kind, where: x.location_name, body: x.body, linked: (x.entities ?? []).map(e => `${e.name} (${e.type} #${e.id})`) }))
    },
  },
  {
    name: 'find_beats',
    description: 'Search all story beats (scenes, reveals, combats, hooks) by words in the title or text.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    run: async ({ query }, { campaignId }) => {
      const q = String(query).toLowerCase()
      const b = await api<{ beats: BoardBeatLite[] }>(`/api/story/board?campaignId=${campaignId}`)
      return b.beats.filter(x => !x.archived && (`${x.title} ${x.body ?? ''}`).toLowerCase().includes(q)).slice(0, 8)
        .map(x => ({ id: x.id, title: x.title, status: x.status, inTray: x.tray_order !== null, body: x.body }))
    },
  },
  {
    name: 'list_quests',
    description: 'All quests with status, giver, place, reward and objectives (done or not).',
    input_schema: { type: 'object', properties: {} },
    run: async (_i, { campaignId }) => api(`/api/quests?campaignId=${campaignId}`),
  },
  {
    name: 'list_clocks',
    description: 'Faction agendas: goal, next step and progress clock (filled / size), with agenda ids.',
    input_schema: { type: 'object', properties: {} },
    run: async (_i, { campaignId }) => api(`/api/story/agendas?campaignId=${campaignId}`),
  },
  {
    name: 'list_encounters',
    description: 'The campaign\'s encounters (combats) with ids and status.',
    input_schema: { type: 'object', properties: {} },
    run: async (_i, { campaignId }) => {
      const r = await api<Array<{ id: number, name: string, status: string }>>(`/api/encounters?campaignId=${campaignId}`)
      return (r ?? []).map(e => ({ id: e.id, name: e.name, status: e.status }))
    },
  },
  {
    name: 'get_encounter',
    description: 'One encounter: participants (participant ids, HP, initiative, notes, stat blocks) and its ships (AC, hull, guns) if it is a naval fight.',
    input_schema: { type: 'object', properties: { encounterId: { type: 'integer' } }, required: ['encounterId'] },
    run: async ({ encounterId }) => {
      const [enc, naval] = await Promise.all([
        api(`/api/encounters/${num(encounterId)}`),
        api(`/api/naval/encounter/${num(encounterId)}`).catch(() => null),
      ])
      return { encounter: enc, naval }
    },
  },
  {
    name: 'get_dm_screen',
    description: 'The DM Screen reference sections (rules reminders, naval combat rules, campaign notes, tonight\'s numbers).',
    input_schema: { type: 'object', properties: {} },
    run: async (_i, { campaignId }) => api(`/api/dashboard/reference?campaignId=${campaignId}`),
  },
  // ---- changes (need the DM's OK) ----
  {
    name: 'change_coins',
    write: true,
    description: 'Change a player\'s purse. add = coins per currency code to add (negative to spend), e.g. {"GP": 50}. Read the purse first so the summary can show before → after.',
    input_schema: { type: 'object', properties: { playerId: { type: 'integer' }, add: { type: 'object', additionalProperties: { type: 'integer' } }, ...summaryProp }, required: ['playerId', 'add', 'summary'] },
    run: async ({ playerId, add }) => {
      const cur = await api<{ coins: Record<string, number> }>(`/api/players/${num(playerId)}/coins`)
      const next = { ...(cur.coins ?? {}) }
      for (const [code, n] of Object.entries((add ?? {}) as Record<string, number>)) next[code] = Math.max(0, (next[code] ?? 0) + Number(n))
      return api(`/api/players/${num(playerId)}/coins`, { method: 'PUT', body: { coins: next } })
    },
  },
  {
    name: 'set_clock',
    write: true,
    description: 'Move a faction clock (agenda): set how many segments are filled, and optionally the next step or status.',
    input_schema: { type: 'object', properties: { agendaId: { type: 'integer' }, clockFilled: { type: 'integer' }, nextStep: { type: 'string' }, status: { type: 'string', enum: ['active', 'achieved', 'foiled'] }, ...summaryProp }, required: ['agendaId', 'summary'] },
    run: async ({ agendaId, clockFilled, nextStep, status }) => {
      const body = Object.fromEntries(Object.entries({ clock_filled: clockFilled, next_step: nextStep, status }).filter(([, v]) => v !== undefined))
      return api(`/api/story/agendas/${num(agendaId)}`, { method: 'PATCH', body })
    },
  },
  {
    name: 'update_beat',
    write: true,
    description: 'Change a story beat\'s status (idea, ready, played, cut) or put it in / take it out of the next-session tray.',
    input_schema: { type: 'object', properties: { beatId: { type: 'integer' }, status: { type: 'string', enum: ['idea', 'ready', 'played', 'cut'] }, inTray: { type: 'boolean' }, ...summaryProp }, required: ['beatId', 'summary'] },
    run: async ({ beatId, status, inTray }) => {
      const body: Record<string, unknown> = {}
      if (status !== undefined) body.status = status
      if (inTray !== undefined) body.in_tray = inTray
      return api(`/api/story/beats/${num(beatId)}`, { method: 'PATCH', body })
    },
  },
  {
    name: 'update_item',
    write: true,
    description: 'Change an item a character carries: quantity, equipped, or the missing flag (stolen / lost / taken; null = back with them). relationId comes from get_player_inventory or get_entity.',
    input_schema: { type: 'object', properties: { entityId: { type: 'integer', description: 'The character who carries it' }, relationId: { type: 'integer' }, quantity: { type: 'integer' }, equipped: { type: 'boolean' }, missing: { type: ['string', 'null'], enum: ['stolen', 'lost', 'taken', null] }, ...summaryProp }, required: ['entityId', 'relationId', 'summary'] },
    run: async ({ entityId, relationId, quantity, equipped, missing }) => {
      const c = await api<{ connections?: Array<{ relationId: number, relationNotes: unknown }> }>(`/api/entities/${num(entityId)}/connections`)
      const rel = (c.connections ?? []).find(r => r.relationId === num(relationId))
      if (!rel) return { ok: false, error: `Relation ${relationId} not found on entity ${entityId}` }
      const cur = rel.relationNotes && typeof rel.relationNotes === 'object' ? { ...(rel.relationNotes as Record<string, unknown>) } : {}
      const notes: Record<string, unknown> = { quantity: 1, equipped: false, ...cur }
      if (quantity !== undefined) notes.quantity = quantity
      if (equipped !== undefined) notes.equipped = equipped
      if (missing !== undefined) {
        if (missing) notes.missing = missing
        else delete notes.missing
      }
      if (notes.missing) notes.equipped = false
      return api(`/api/entity-relations/${num(relationId)}`, { method: 'PATCH', body: { notes } })
    },
  },
  {
    name: 'set_hp',
    write: true,
    description: 'Set a combat participant\'s current HP (or temp HP) in an encounter. participantId comes from get_encounter.',
    input_schema: { type: 'object', properties: { encounterId: { type: 'integer' }, participantId: { type: 'integer' }, currentHp: { type: 'integer' }, tempHp: { type: 'integer' }, ...summaryProp }, required: ['encounterId', 'participantId', 'summary'] },
    run: async ({ encounterId, participantId, currentHp, tempHp }) =>
      api(`/api/encounters/${num(encounterId)}/participants/${num(participantId)}`, { method: 'PATCH', body: { current_hp: currentHp, temp_hp: tempHp } }),
  },
  {
    name: 'create_item',
    write: true,
    description: 'Create a new item entry (e.g. one you looked up on the web or the DM described). Optionally hand it straight to a character with giveTo (player or NPC entity id). Search first so you do not duplicate an existing item.',
    input_schema: { type: 'object', properties: {
      name: { type: 'string' },
      description: { type: 'string', description: 'What it is, what it does, what it looks like. Full rules text if relevant.' },
      type: { type: 'string', enum: [...ITEM_TYPES] },
      rarity: { type: 'string', enum: [...ITEM_RARITIES] },
      value: { type: 'number', description: 'Value in gold pieces' },
      weight: { type: 'number', description: 'Weight in lb' },
      attunement: { type: 'boolean' },
      damage: { type: 'string', description: 'e.g. 1d8 slashing' },
      armor_class: { type: 'integer' },
      properties: { type: 'string', description: 'e.g. Finesse, Light' },
      giveTo: { type: 'integer', description: 'Entity id of the character who gets it (optional)' },
      quantity: { type: 'integer' },
      ...summaryProp,
    }, required: ['name', 'summary'] },
    run: async ({ name, description, type, rarity, value, weight, attunement, damage, armor_class, properties, giveTo, quantity }, ctx) => {
      const metadata = Object.fromEntries(Object.entries({ type, rarity, value, weight, attunement, damage, armor_class, properties }).filter(([, v]) => v !== undefined))
      const item = await api<{ id: number, name: string }>('/api/items', { method: 'POST', body: { name, description, metadata, campaignId: ctx.campaignId } })
      if (giveTo) await giveItem(num(giveTo), item.id, num(quantity ?? 1))
      return { created: item, givenTo: giveTo ?? null }
    },
  },
  {
    name: 'give_item',
    write: true,
    description: 'Put an existing item into a character\'s inventory (player or NPC). If they already carry it, adds to the quantity.',
    input_schema: { type: 'object', properties: { itemId: { type: 'integer' }, toEntityId: { type: 'integer' }, quantity: { type: 'integer' }, ...summaryProp }, required: ['itemId', 'toEntityId', 'summary'] },
    run: async ({ itemId, toEntityId, quantity }) => giveItem(num(toEntityId), num(itemId), num(quantity ?? 1)),
  },
  {
    name: 'create_entry',
    write: true,
    description: 'Create a new NPC, location, faction or lore entry with a name and description.',
    input_schema: { type: 'object', properties: { kind: { type: 'string', enum: ['npc', 'location', 'faction', 'lore'] }, name: { type: 'string' }, description: { type: 'string' }, ...summaryProp }, required: ['kind', 'name', 'summary'] },
    run: async ({ kind, name, description }, ctx) => {
      const path = { npc: '/api/npcs', location: '/api/locations', faction: '/api/factions', lore: '/api/lore' }[String(kind) as 'npc']
      return api(path, { method: 'POST', body: { name, description, campaignId: ctx.campaignId } })
    },
  },
]

const TOOL_BY_NAME = new Map(TOOLS.map(t => [t.name, t]))

function getClaudeConfig(): { apiKey: string, model: string } {
  const db = getDb()
  const read = (key: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    if (!row?.value) return ''
    try {
      return decrypt(row.value).trim()
    }
    catch {
      return ''
    }
  }
  const apiKey = read('claude_api_key')
  if (!apiKey) throw createError({ statusCode: 400, message: 'Add your Claude API key in Settings → AI to use the assistant.' })
  return { apiKey, model: read('claude_model') || DEFAULT_CLAUDE_MODEL }
}

function systemPrompt(campaignName: string) {
  return [
    `You are the Dungeon Master's quick helper inside DM Hero, for the campaign "${campaignName}". The DM is usually mid-session and needs fast, exact answers.`,
    'Look things up with the tools before answering; never guess stats, items, gold or names. Search first when the DM names something.',
    'Answer in a few short lines of plain text. Lead with the answer (the number, the item, the name). No preamble.',
    'D&D 5e rules questions you can answer from your own knowledge; campaign facts come only from the tools.',
    'Use web_search for anything you are not sure of or that lives online (official item stats, rules text, real-world facts). Say briefly where it came from.',
    'To add something the DM asks for (an item, NPC, place), search the campaign first, then call create_item / create_entry / give_item with full details filled in.',
    'When the DM asks for a change (gold, items, clocks, beats, HP), call the matching change tool once with a clear summary. The app asks the DM to confirm; do not ask again in text.',
    'If a change was declined, say so in one line and stop.',
  ].join('\n')
}

async function callClaude(messages: AssistantMessage[], system: string): Promise<{ content: AssistantBlock[], stop_reason: string }> {
  const { apiKey, model } = getClaudeConfig()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system,
      tools: [
        ...TOOLS.map(t => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
        // Anthropic-hosted web search: runs on their side, results come back in the reply
        { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
      ],
      messages,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw createError({ statusCode: res.status, message: err.error?.message || `Claude API request failed (${res.status})` })
  }
  return await res.json() as { content: AssistantBlock[], stop_reason: string }
}

async function runTool(block: AssistantBlock, campaignId: number, approved: boolean | null): Promise<AssistantBlock> {
  const tool = TOOL_BY_NAME.get(block.name ?? '')
  if (!tool) return { type: 'tool_result', tool_use_id: block.id, content: `Unknown tool ${block.name}`, is_error: true }
  if (tool.write && approved !== true) {
    return { type: 'tool_result', tool_use_id: block.id, content: 'The DM declined this change. Nothing was changed.' }
  }
  try {
    const out = await tool.run(block.input ?? {}, { campaignId })
    let text = typeof out === 'string' ? out : JSON.stringify(out)
    if (text.length > MAX_RESULT) text = `${text.slice(0, MAX_RESULT)}… (cut)`
    return { type: 'tool_result', tool_use_id: block.id, content: text }
  }
  catch (e) {
    const err = e as { data?: { message?: string }, message?: string }
    return { type: 'tool_result', tool_use_id: block.id, content: `Error: ${err.data?.message || err.message || 'failed'}`, is_error: true }
  }
}

/**
 * One turn of the conversation. Pass the whole message list (the app keeps it).
 * `decision` answers pending changes from the previous turn.
 */
export async function runAssistant(opts: { campaignId: number, messages: AssistantMessage[], decision?: { approve: boolean } }) {
  const db = getDb()
  const campaign = db.prepare('SELECT name FROM campaigns WHERE id = ?').get(opts.campaignId) as { name: string } | undefined
  const system = systemPrompt(campaign?.name ?? 'this campaign')
  const messages = [...opts.messages]
  let changed = false

  // Resolve the tool calls the last turn stopped on (pending changes)
  const last = messages[messages.length - 1]
  if (opts.decision && last?.role === 'assistant' && Array.isArray(last.content)) {
    const uses = last.content.filter(b => b.type === 'tool_use')
    const results: AssistantBlock[] = []
    for (const u of uses) {
      results.push(await runTool(u, opts.campaignId, opts.decision.approve))
      if (TOOL_BY_NAME.get(u.name ?? '')?.write && opts.decision.approve) changed = true
    }
    messages.push({ role: 'user', content: results })
  }

  for (let step = 0; step < 10; step++) {
    const reply = await callClaude(messages, system)
    messages.push({ role: 'assistant', content: reply.content })
    // Long web searches can pause the turn; just let Claude carry on
    if (reply.stop_reason === 'pause_turn') continue
    const uses = reply.content.filter(b => b.type === 'tool_use')
    if (!uses.length) {
      const text = reply.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
      return { messages, reply: text, changed }
    }
    const writes = uses.filter(u => TOOL_BY_NAME.get(u.name ?? '')?.write)
    if (writes.length) {
      const pending: PendingChange[] = writes.map(w => ({ id: w.id!, tool: w.name!, summary: String(w.input?.summary ?? w.name) }))
      const text = reply.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
      return { messages, reply: text, pending, changed }
    }
    const results: AssistantBlock[] = []
    for (const u of uses) results.push(await runTool(u, opts.campaignId, null))
    messages.push({ role: 'user', content: results })
  }
  return { messages, reply: 'That took too many lookups. Try asking more specifically.', changed }
}
