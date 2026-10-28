/**
 * Click a tag chip → the list page you're on filters by that tag.
 *
 * List pages register what "filter by this tag" means for them (usually:
 * close an open folder and add `#tag` to the search box). Tag chips call
 * `requestTagFilter(name)`. Search already understands `#tag` tokens.
 */
import { onBeforeUnmount } from 'vue'

type TagFilterHandler = (tag: string) => void

const handlers = new Set<TagFilterHandler>()

/** Adds `#tag` to a search string unless it's already in there. */
export function addTagToSearch(current: string | null | undefined, tag: string): string {
  const text = (current ?? '').trim()
  const token = `#${tag}`
  if (text.split(/\s+/).includes(token)) return text
  return text ? `${text} ${token}` : token
}

/** Register this page's tag-filter behaviour (removed again on unmount). */
export function onTagFilter(handler: TagFilterHandler) {
  handlers.add(handler)
  onBeforeUnmount(() => handlers.delete(handler))
}

/** Ask the current page to filter by a tag. Returns false when no page listens. */
export function requestTagFilter(tag: string): boolean {
  handlers.forEach(h => h(tag))
  return handlers.size > 0
}

export function hasTagFilterTarget(): boolean {
  return handlers.size > 0
}
