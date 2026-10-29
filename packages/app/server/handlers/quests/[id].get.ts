import { getDb } from '../../utils/db'
import { loadQuest } from '../../utils/storyBoard'

/** GET /api/quests/:id */
export default defineEventHandler((event) => {
  const db = getDb()
  const quest = loadQuest(db, Number(getRouterParam(event, 'id')))
  if (!quest) throw createError({ statusCode: 404, message: 'Quest not found' })
  return quest
})
