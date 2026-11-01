<template>
  <div>
    <v-card variant="tonal" class="pa-3 mb-3">
      <div class="d-flex flex-wrap align-center ga-3">
        <v-switch v-model="hideMinor" :label="$t('story.timeline.hideMinor')" color="primary" density="compact" hide-details />
        <v-switch v-model="hideOptional" :label="$t('story.timeline.hideOptional')" color="primary" density="compact" hide-details />
        <v-switch v-model="hideDone" :label="$t('story.timeline.hideDone')" color="primary" density="compact" hide-details />
        <v-spacer />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="editQuestline(null)">{{ $t('story.questline.new') }}</v-btn>
      </div>
      <div class="d-flex flex-wrap align-center ga-4 mt-3 text-body-small text-medium-emphasis">
        <span><v-icon size="small" class="mr-1">mdi-star</v-icon>{{ $t('quests.major') }}</span>
        <span><v-icon size="small" class="mr-1">mdi-star-outline</v-icon>{{ $t('quests.minor') }}</span>
        <span class="d-flex align-center"><span class="legend-optional mr-1" />{{ $t('quests.optional') }}</span>
        <span><v-icon size="small" class="mr-1">mdi-eye-off</v-icon>{{ $t('quests.giverHiddenShort') }}</span>
        <span>{{ $t('story.timeline.hint') }}</span>
      </div>
    </v-card>

    <div v-if="!store.questlines.length" class="text-center py-10 text-medium-emphasis">
      <v-icon size="56" class="mb-2">mdi-timeline-outline</v-icon>
      <div class="text-title-medium mb-1">{{ $t('story.timeline.emptyTitle') }}</div>
      <div class="text-body-medium mb-4">{{ $t('story.timeline.emptyText') }}</div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="editQuestline(null)">{{ $t('story.questline.new') }}</v-btn>
    </div>

    <!-- One group per storyline, one row per questline -->
    <section v-for="group in groups" :key="group.key" class="tl-group" :style="{ '--group-color': `rgb(var(--v-theme-${group.color}))` }">
      <div class="d-flex align-center mb-2">
        <span class="tl-dot mr-2" />
        <span class="text-title-small font-weight-bold">{{ group.title }}</span>
        <v-btn size="x-small" variant="text" prepend-icon="mdi-plus" class="ml-2" @click="editQuestline(null, group.storylineId)">{{ $t('story.questline.new') }}</v-btn>
      </div>

      <div v-for="row in group.rows" :key="row.line.id" class="tl-row" :class="{ 'tl-row--optional': row.line.optional, 'tl-row--minor': row.line.importance === 'minor' }">
        <div class="tl-row__head">
          <v-icon size="small" class="mr-1">{{ row.line.importance === 'major' ? 'mdi-star' : 'mdi-star-outline' }}</v-icon>
          <span class="text-body-large font-weight-bold tl-row__name" role="button" tabindex="0" @click="editQuestline(row.line)" @keydown.enter="editQuestline(row.line)">{{ row.line.name }}</span>
          <v-chip v-if="row.line.optional" size="x-small" variant="outlined" class="ml-2">{{ $t('quests.optional') }}</v-chip>
          <v-chip size="x-small" class="ml-2">{{ row.items.length }}</v-chip>
          <v-spacer />
          <v-btn size="x-small" variant="text" prepend-icon="mdi-plus" @click="newQuest(row.line.id)">{{ $t('quests.new') }}</v-btn>
          <v-btn size="x-small" variant="text" icon="mdi-pencil" :aria-label="$t('common.edit')" @click="editQuestline(row.line)" />
        </div>
        <div v-if="row.line.notes" class="text-body-small text-medium-emphasis mb-2 tl-notes">{{ row.line.notes }}</div>
        <draggable
          v-model="row.items"
          item-key="id"
          group="timeline-quests"
          :animation="180"
          class="tl-chain"
          :class="{ 'tl-chain--empty': !row.items.length }"
          :data-empty-text="$t('story.timeline.dropHere')"
          @start="dragging = true"
          @end="dragging = false"
          @change="onChange(row.line.id, row.items, $event)"
        >
          <template #item="{ element }">
            <div class="tl-item">
              <StoryTimelineQuest :quest="element" :line="row.line" @edit="editQuest" />
            </div>
          </template>
        </draggable>
      </div>
    </section>

    <!-- Quests not in a questline yet: drag them into a row -->
    <section class="tl-group tl-group--loose">
      <div class="d-flex align-center mb-2">
        <v-icon size="small" class="mr-2">mdi-tray</v-icon>
        <span class="text-title-small font-weight-bold">{{ $t('story.timeline.loose') }}</span>
        <v-chip size="x-small" class="ml-2">{{ looseList.length }}</v-chip>
        <v-btn size="x-small" variant="text" prepend-icon="mdi-plus" class="ml-2" @click="newQuest(null)">{{ $t('quests.new') }}</v-btn>
      </div>
      <draggable
        v-model="looseList"
        item-key="id"
        group="timeline-quests"
        :animation="180"
        class="tl-loose"
        :class="{ 'tl-chain--empty': !looseList.length }"
        :data-empty-text="$t('story.timeline.looseEmpty')"
        @start="dragging = true"
        @end="dragging = false"
        @change="onChange(null, looseList, $event)"
      >
        <template #item="{ element }">
          <div class="tl-loose__item">
            <StoryTimelineQuest :quest="element" :line="null" @edit="editQuest" />
          </div>
        </template>
      </draggable>
    </section>

    <StoryQuestlineDialog v-model="lineOpen" :questline="lineEditing" :default-storyline-id="lineStoryline" />
    <QuestEditDialog v-model:show="questOpen" :quest-id="questEditingId" :initial-questline-id="questLine" />
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import StoryTimelineQuest from './StoryTimelineQuest.vue'
import StoryQuestlineDialog from './StoryQuestlineDialog.vue'
import QuestEditDialog from '~/components/quests/QuestEditDialog.vue'
import { NO_COLOR, effectiveImportance, effectiveOptional, type Quest, type Questline } from '~~/types/story'

/**
 * Timeline: questlines as rows of quests in order, grouped by storyline.
 * Drag to reorder or move a quest into another questline.
 */
const { t } = useI18n()
const store = useStoryBoardStore()

const hideMinor = ref(false)
const hideOptional = ref(false)
const hideDone = ref(false)
const dragging = ref(false)

function shown(q: Quest, line: Questline | null) {
  if (hideMinor.value && effectiveImportance(q, line) === 'minor') return false
  if (hideOptional.value && effectiveOptional(q, line)) return false
  if (hideDone.value && (q.status === 'completed' || q.status === 'failed')) return false
  return true
}
const inOrder = (a: Quest, b: Quest) => a.questline_order - b.questline_order || a.name.localeCompare(b.name)

interface Row { line: Questline, items: Quest[] }
interface Group { key: string, title: string, color: string, storylineId: number | null, rows: Row[] }

const groups = ref<Group[]>([])
const looseList = ref<Quest[]>([])

function rebuild() {
  const rowFor = (line: Questline): Row | null => {
    if ((hideMinor.value && line.importance === 'minor') || (hideOptional.value && line.optional)) return null
    return { line, items: store.quests.filter(q => q.questline_id === line.id && shown(q, line)).sort(inOrder) }
  }
  const list: Group[] = store.storylines.map(s => ({
    key: `line-${s.id}`,
    title: s.name,
    color: `story-${s.color}`,
    storylineId: s.id,
    rows: store.questlines.filter(q => q.storyline_id === s.id).map(rowFor).filter((r): r is Row => !!r),
  }))
  list.push({
    key: 'line-none',
    title: t('story.storyline.noneShort'),
    color: NO_COLOR,
    storylineId: null,
    rows: store.questlines.filter(q => !q.storyline_id || !store.storylines.some(s => s.id === q.storyline_id)).map(rowFor).filter((r): r is Row => !!r),
  })
  groups.value = list.filter(g => g.rows.length)
  looseList.value = store.quests.filter(q => !q.questline_id && shown(q, null)).sort((a, b) => a.name.localeCompare(b.name))
}
watch(() => [store.quests, store.questlines, store.storylines, hideMinor.value, hideOptional.value, hideDone.value], () => {
  if (!dragging.value) rebuild()
}, { deep: true, immediate: true })
watch(dragging, (d) => {
  if (!d) rebuild()
})

async function onChange(questlineId: number | null, items: Quest[], e: { added?: unknown, moved?: unknown }) {
  if (!e.added && !e.moved) return
  // Hidden quests in the row keep their place after the shown ones
  const shownIds = items.map(q => q.id)
  const hidden = questlineId ? store.quests.filter(q => q.questline_id === questlineId && !shownIds.includes(q.id)).sort(inOrder).map(q => q.id) : []
  await store.saveTimeline({ chains: [{ questlineId, questIds: [...shownIds, ...hidden] }] })
}

// --- dialogs -------------------------------------------------------------
const lineOpen = ref(false)
const lineEditing = ref<Questline | null>(null)
const lineStoryline = ref<number | null>(null)
function editQuestline(line: Questline | null, storylineId: number | null = null) {
  lineEditing.value = line
  lineStoryline.value = storylineId
  lineOpen.value = true
}

const questOpen = ref(false)
const questEditingId = ref<number | null>(null)
const questLine = ref<number | null>(null)
function editQuest(q: Quest) {
  questEditingId.value = q.id
  questLine.value = null
  questOpen.value = true
}
function newQuest(questlineId: number | null) {
  questEditingId.value = null
  questLine.value = questlineId
  questOpen.value = true
}
</script>

<style scoped>
.tl-group {
  margin-bottom: 20px;
  border-left: 4px solid var(--group-color, rgba(var(--v-theme-on-surface), 0.2));
  padding-left: 12px;
}
.tl-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--group-color);
}
.tl-row {
  margin-bottom: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
.tl-row--optional {
  border-style: dashed;
  border-color: rgba(var(--v-theme-on-surface), 0.35);
}
.tl-row--minor .tl-row__name {
  font-weight: 500 !important;
}
.tl-row__head {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}
.tl-row__name {
  cursor: pointer;
}
.tl-notes {
  white-space: pre-line;
}
/* Quests left to right, joined by arrows */
.tl-chain {
  display: flex;
  align-items: stretch;
  gap: 32px;
  overflow-x: auto;
  padding: 4px 4px 8px;
  min-height: 60px;
}
.tl-item {
  position: relative;
  flex: 0 0 auto;
}
.tl-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -26px;
  width: 20px;
  height: 2px;
  background: rgba(var(--v-theme-on-surface), 0.45);
}
.tl-item:not(:last-child)::before {
  content: '';
  position: absolute;
  top: calc(50% - 4px);
  right: -27px;
  border: 5px solid transparent;
  border-left: 7px solid rgba(var(--v-theme-on-surface), 0.45);
  border-right: 0;
}
.tl-loose {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 60px;
}
.tl-chain--empty {
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
}
.tl-chain--empty::after {
  content: attr(data-empty-text);
  font-size: 0.8rem;
  opacity: 0.6;
  padding: 12px;
}
.legend-optional {
  display: inline-block;
  width: 22px;
  height: 12px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.6);
  border-radius: 3px;
}
</style>
