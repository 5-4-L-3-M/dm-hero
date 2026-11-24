import { runAssistant, type AssistantMessage } from '../../utils/assistant'

interface ChatBody {
  campaignId: number
  messages: AssistantMessage[]
  decision?: { approve: boolean }
}

/** The in-app assistant: one conversation turn (see utils/assistant.ts). */
export default defineEventHandler(async (event) => {
  const body = await readBody<ChatBody>(event)
  if (!body?.campaignId || !Array.isArray(body.messages)) {
    throw createError({ statusCode: 400, message: 'campaignId and messages are required' })
  }
  return runAssistant({ campaignId: Number(body.campaignId), messages: body.messages, decision: body.decision })
})
