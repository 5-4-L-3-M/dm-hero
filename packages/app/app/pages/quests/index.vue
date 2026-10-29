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
        <v-text-field
          v-model="search"
          :placeholder="$t('common.search')"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="search-field"
        />
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

    <QuestEditDialog v-model:show="dialogOpen" :quest-id="editingId" :initial-status="initialStatus" @saved="rebuild" @deleted="rebuild" />
  </v-container>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import QuestCard from '~/components/quests/QuestCard.vue'
import QuestEditDialog from '~/components/quests/QuestEditDialog.vue'
import { QUEST_STATUSES, QUEST_STATUS_ICONS, type Quest, type QuestStatus } from '~~/types/story'

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

function rebuild() {
  const q = search.value?.toLowerCase().trim() ?? ''
  const filtered = store.quests.filter(x =>
    (!q || x.name.toLowerCase().includes(q) || (x.description ?? '').toLowerCase().includes(q))
    && (!storylineFilter.value || x.storyline_id === storylineFilter.value),
  )
  columns.value = QUEST_STATUSES.map(status => ({ status, color: COLUMN_COLORS[status], items: filtered.filter(x => x.status === status) }))
}
watch(() => [store.quests, search.value, storylineFilter.value], rebuild, { deep: true })

watch(campaignId, id => store.load(id), { immediate: true })
onMounted(() => store.loadQuests().then(rebuild))

async function onChange(status: QuestStatus, e: { added?: unknown, moved?: unknown }) {
  if (!e.added && !e.moved) return
  const col = columns.value.find(c => c.status === status)!
  await Promise.all(col.items.map((quest, i) =>
    quest.status !== status || quest.sort_order !== i ? store.saveQuest(quest.id, { status, sort_order: i }) : null,
  ))
}

const dialogOpen = ref(false)
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
</style>
