<template>
  <v-container fluid class="quests-page">
    <div v-if="!campaignId" class="text-center py-16">
      <v-icon icon="mdi-script-text" size="64" class="mb-4" color="primary" />
      <h2 class="text-headline-large mb-4">{{ $t('story.noCampaign') }}</h2>
      <v-btn color="primary" size="large" to="/campaigns" prepend-icon="mdi-arrow-right">{{ $t('nav.chooseCampaign') }}</v-btn>
    </div>

    <template v-else>
      <div class="d-flex align-center flex-wrap ga-3 mb-4">
        <div>
          <div class="text-headline-large">
            <v-icon icon="mdi-script-text" size="36" class="mr-2" />{{ $t('quests.title') }}
          </div>
          <p class="text-body-large text-medium-emphasis">{{ $t('quests.subtitle') }}</p>
        </div>
        <v-spacer />
        <v-btn variant="text" prepend-icon="mdi-archive-outline" @click="archiveOpen = true">{{ $t('story.archive.title') }}<v-chip v-if="store.quests.some(q => q.archived)" size="x-small" class="ml-1">{{ store.quests.filter(q => q.archived).length }}</v-chip></v-btn>
        <v-text-field
          v-model="search"
          :placeholder="$t('quests.searchPlaceholder')"
          :title="$t('quests.searchHint')"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="search-field search-field--wide"
        />
        <!-- People & places: only quests tied to every pick (as giver, place, involved or in one of its beats) -->
        <v-autocomplete
          v-model="linkFilter"
          :items="linkOptions"
          :label="$t('quests.peoplePlaces')"
          variant="outlined"
          density="compact"
          hide-details
          multiple
          chips
          closable-chips
          clearable
          class="search-field search-field--wide"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :prepend-icon="item.icon" />
          </template>
        </v-autocomplete>
        <v-select
          v-model="storylineFilter"
          :items="store.storylines.map(s => ({ title: s.name, value: s.id }))"
          :label="$t('story.storyline.label')"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="search-field"
        />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="newQuest('rumor')">{{ $t('quests.new') }}</v-btn>
      </div>

      <v-progress-linear v-if="store.loading && !store.quests.length" indeterminate class="mb-3" />

      <div class="quest-columns">
        <div v-for="col in columns" :key="col.status" class="quest-column">
          <div class="d-flex align-center mb-2 px-1">
            <v-icon size="small" class="mr-2" :color="col.color">{{ QUEST_STATUS_ICONS[col.status] }}</v-icon>
            <span class="text-title-small font-weight-bold">{{ $t(`quests.statuses.${col.status}`) }}</span>
            <v-chip size="x-small" class="ml-2">{{ col.items.length }}</v-chip>
            <v-spacer />
            <v-btn icon="mdi-plus" variant="text" size="x-small" :aria-label="$t('quests.new')" @click="newQuest(col.status)" />
          </div>
          <draggable
            v-model="col.items"
            item-key="id"
            group="quests"
            handle=".quest-handle"
            :animation="180"
            class="quest-list"
            :data-empty-text="$t('quests.dropHere')"
            @change="onChange(col.status, $event)"
          >
            <template #item="{ element }">
              <QuestCard :quest="element" :highlight="element.id === highlightId" class="mb-2" @open="openQuest" @edit="editQuest" />
            </template>
          </draggable>
        </div>
      </div>
    </template>

    <StoryArchiveDialog v-model="archiveOpen" />
    <QuestEditDialog v-model:show="dialogOpen" :quest-id="editingId" :initial-status="initialStatus" @saved="rebuild" @deleted="rebuild" />
  </v-container>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import QuestCard from '~/components/quests/QuestCard.vue'
import QuestEditDialog from '~/components/quests/QuestEditDialog.vue'
import StoryArchiveDialog from '~/components/story/StoryArchiveDialog.vue'
import { QUEST_STATUSES, QUEST_STATUS_ICONS, type LinkedEntity, type Quest, type QuestStatus } from '~~/types/story'
import { ENTITY_PREVIEW_CONFIG } from '~/utils/entityPreview'
import { toPreviewType } from '~/stores/entityTabs'

/** Quest board: rumors → active → completed / failed. Drag a card to change its status. */
const route = useRoute()
const campaignStore = useCampaignStore()
const store = useStoryBoardStore()
const tabs = useEntityTabsStore()

const campaignId = computed(() => campaignStore.activeCampaignIdNumber)
const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const storylineFilter = ref<number | null>(null)
const highlightId = computed(() => Number(route.query.highlight) || null)

const COLUMN_COLORS: Record<QuestStatus, string> = { rumor: 'warning', active: 'primary', completed: 'success', failed: 'error' }
const columns = ref<{ status: QuestStatus, color: string, items: Quest[] }[]>([])

// --- search: words anywhere in the quest or its story beats; people & places it's tied to ---
const linkFilter = ref<string[]>([])
const linkKey = (e: LinkedEntity) => `${e.type}-${e.id}`
const placeOf = (id: number | null, name: string | null): LinkedEntity[] => (id && name ? [{ id, name, type: 'Location' }] : [])
const searchIndex = computed(() => {
  const index = new Map<number, { text: string, links: LinkedEntity[] }>()
  for (const q of store.quests) {
    const links: LinkedEntity[] = [...q.givers, ...q.involved, ...placeOf(q.location_id, q.location_name)]
    const parts: (string | null)[] = [q.name, q.description, q.reward, ...q.objectives.map(o => o.text)]
    // The quest's clusters and beats on the Story Board count too
    for (const c of store.clusters.filter(c => c.quest_id === q.id)) {
      parts.push(c.title, c.notes)
      links.push(...placeOf(c.location_id, c.location_name))
      for (const b of store.beatsOf(c.id)) {
        parts.push(b.title, b.body)
        links.push(...b.entities, ...placeOf(b.location_id, b.location_name))
      }
    }
    parts.push(...links.map(l => l.name))
    index.set(q.id, { text: parts.filter(Boolean).join('\n').toLowerCase(), links })
  }
  return index
})
const linkOptions = computed(() => {
  const seen = new Map<string, { title: string, value: string, icon: string }>()
  for (const { links } of searchIndex.value.values()) {
    for (const e of links) {
      const t = toPreviewType(e.type)
      if (!seen.has(linkKey(e))) seen.set(linkKey(e), { title: e.name, value: linkKey(e), icon: t ? ENTITY_PREVIEW_CONFIG[t].icon : 'mdi-link' })
    }
  }
  return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title))
})

function rebuild() {
  const q = search.value?.toLowerCase().trim() ?? ''
  const filtered = store.activeQuests.filter((x) => {
    const entry = searchIndex.value.get(x.id)
    return (!q || !!entry?.text.includes(q))
      && (!linkFilter.value.length || linkFilter.value.every(k => entry?.links.some(e => linkKey(e) === k)))
      && (!storylineFilter.value || x.storyline_id === storylineFilter.value)
  })
  // Saved order first (drag & drop), then name — the store's list isn't re-sorted after a save
  const ordered = [...filtered].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  columns.value = QUEST_STATUSES.map(status => ({ status, color: COLUMN_COLORS[status], items: ordered.filter(x => x.status === status) }))
}
watch(() => [store.quests, search.value, storylineFilter.value, linkFilter.value, searchIndex.value], rebuild, { deep: true })

watch(campaignId, id => store.load(id), { immediate: true })
onMounted(() => store.loadQuests().then(rebuild))

async function onChange(status: QuestStatus, e: { added?: unknown, moved?: unknown }) {
  if (!e.added && !e.moved) return
  const col = columns.value.find(c => c.status === status)!
  // Apply the new order to the store first, so a redraw mid-save can't jump cards back
  const changed = col.items
    .map((quest, i) => ({ quest: store.quests.find(q => q.id === quest.id), i }))
    .filter(({ quest, i }) => quest && (quest.status !== status || quest.sort_order !== i))
  for (const { quest, i } of changed) Object.assign(quest!, { status, sort_order: i })
  rebuild()
  await Promise.all(changed.map(({ quest, i }) => store.saveQuest(quest!.id, { status, sort_order: i })))
}

const dialogOpen = ref(false)
const archiveOpen = ref(false)
const editingId = ref<number | null>(null)
const initialStatus = ref<QuestStatus>('rumor')
function newQuest(status: QuestStatus) {
  editingId.value = null
  initialStatus.value = status
  dialogOpen.value = true
}
function editQuest(q: Quest) {
  editingId.value = q.id
  dialogOpen.value = true
}
function openQuest(q: Quest) {
  tabs.open('quest', q.id, q.name)
}
</script>

<style scoped>
.quest-columns {
  display: grid;
  grid-template-columns: repeat(4, minmax(240px, 1fr));
  gap: 16px;
  overflow-x: auto;
  align-items: start;
}
.quest-column {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 12px;
  padding: 8px;
  min-height: 200px;
}
.quest-list {
  min-height: 120px;
}
.quest-list:empty::after {
  content: attr(data-empty-text);
  display: block;
  text-align: center;
  font-size: 0.8rem;
  opacity: 0.5;
  padding: 24px 8px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
}
.search-field {
  max-width: 220px;
  min-width: 160px;
}
.search-field--wide {
  max-width: 300px;
  min-width: 220px;
}
</style>
