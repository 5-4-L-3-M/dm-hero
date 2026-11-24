import { runAssistant, type AssistantMessage } from '../utils/assistant'

interface ChatBody { campaignId: number, messages: AssistantMessage[], decision?: { approve: boolean } }

/**
 * POST /api/assistant/chat — served from middleware on purpose: Nitro types every
 * file route into one big union, and one more route tips TypeScript's depth limit
 * on dynamic $fetch calls across the app. Middleware isn't part of that union.
 */
export default defineEventHandler(async (event) => {
  if (event.method !== 'POST' || event.path.split('?')[0] !== '/api/assistant/chat') return
  const body = await readBody<ChatBody>(event)
  if (!body?.campaignId || !Array.isArray(body.messages)) throw createError({ statusCode: 400, message: 'campaignId and messages are required' })
  return await runAssistant({ campaignId: Number(body.campaignId), messages: body.messages, decision: body.decision })
})
