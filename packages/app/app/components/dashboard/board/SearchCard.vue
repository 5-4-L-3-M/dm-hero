<template>
  <div class="d-flex align-center ga-2 h-100 px-2">
    <v-autocomplete
      v-model:search="text"
      :model-value="null"
      :items="items"
      item-title="name"
      item-value="key"
      :placeholder="$t('dashboardBoards.cards.search.placeholder')"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      hide-details
      auto-select-first
      :custom-filter="filter"
      :menu-props="{ maxHeight: 420 }"
      class="flex-grow-1"
      @update:model-value="pick"
    >
      <template #item="{ props: itemProps, item }">
        <v-list-item v-bind="itemProps" :subtitle="$t(`entityTabs.types.${item.ptype}`)">
          <template #prepend>
            <v-icon :color="ENTITY_PREVIEW_CONFIG[item.ptype].color">{{ ENTITY_PREVIEW_CONFIG[item.ptype].icon }}</v-icon>
          </template>
        </v-list-item>
      </template>
    </v-autocomplete>
  </div>
</template>

<script setup lang="ts">
import { ENTITY_PREVIEW_CONFIG } from '~/utils/entityPreview'
import { toPreviewType } from '~/stores/entityTabs'

/** Type a name, it opens in the side panel. */
const story = useStoryBoardStore()
const tabs = useEntityTabsStore()
const text = ref('')

const items = computed(() => {
  const seen = new Set<string>()
  const all = [...story.entities, ...story.locations.map(l => ({ id: l.id, name: l.name, type: 'Location' }))]
  return all.flatMap((e) => {
    const ptype = toPreviewType(e.type)
    const key = ptype ? `${ptype}:${e.id}` : ''
    if (!ptype || seen.has(key)) return []
    seen.add(key)
    return [{ key, id: e.id, name: e.name, ptype }]
  }).sort((a, b) => a.name.localeCompare(b.name))
})
function filter(value: string, query: string) {
  const v = value.toLowerCase()
  return query.toLowerCase().split(/\s+/).filter(Boolean).every(w => v.includes(w))
}
function pick(key: string | null) {
  const item = items.value.find(i => i.key === key)
  if (!item) return
  tabs.open(item.ptype, item.id, item.name)
  text.value = ''
}
</script>
