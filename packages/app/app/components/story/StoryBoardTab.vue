<template>
  <div>
    <!-- Next session: a band across the top, the plan for the table -->
    <v-card class="tray-band mb-3" color="primary" variant="tonal">
      <div class="d-flex align-center flex-wrap ga-2 px-4 pt-3">
        <v-icon color="primary">mdi-calendar-star</v-icon>
        <span class="text-title-medium font-weight-bold">{{ $t('story.tray.title') }}</span>
        <v-chip size="x-small" color="primary" variant="flat">{{ store.tray.length }}</v-chip>
        <v-spacer />
        <v-btn color="primary" variant="flat" size="small" prepend-icon="mdi-format-list-numbered" :disabled="!store.tray.length" @click="$emit('open-run-sheet')">
          {{ $t('story.run.open') }}
        </v-btn>
      </div>
      <div class="px-4 pb-3 pt-2">
        <div v-if="!store.tray.length" class="text-body-small text-medium-emphasis">{{ $t('story.tray.empty') }}</div>
        <draggable v-model="trayList" item-key="id" :animation="180" class="tray-strip" @change="saveTray">
          <template #item="{ element, index }">
            <div class="tray-item" role="button" tabindex="0" @click="editBeat(element)" @keydown.enter="editBeat(element)">
              <span class="tray-item__num">{{ index + 1 }}</span>
              <v-icon size="small" class="mx-1">{{ BEAT_KIND_ICONS[element.kind as BeatKind] }}</v-icon>
              <span class="tray-item__title">{{ element.title }}</span>
              <v-btn icon="mdi-close" size="x-small" variant="text" :aria-label="$t('story.tray.remove')" @click.stop="toggleTray(element)" />
            </div>
          </template>
        </draggable>
      </div>
    </v-card>

    <!-- Toolbar: lanes, colors, filters -->
    <v-card variant="tonal" class="pa-3 mb-3">
      <div class="d-flex flex-wrap align-center ga-3">
        <div class="d-flex align-center ga-2">
          <span class="text-body-small text-medium-emphasis">{{ $t('story.groupBy.label') }}</span>
          <v-btn-toggle :model-value="store.settings.group_by" mandatory density="compact" variant="outlined" divided @update:model-value="store.saveSettings({ group_by: $event })">
            <v-btn v-for="g in GROUP_BY" :key="g" :value="g" size="small">{{ $t(`story.groupBy.${g}`) }}</v-btn>
          </v-btn-toggle>
        </div>
        <div class="d-flex align-center ga-2">
          <span class="text-body-small text-medium-emphasis">{{ $t('story.colorBy.label') }}</span>
          <v-btn-toggle :model-value="store.settings.color_by" mandatory density="compact" variant="outlined" divided @update:model-value="store.saveSettings({ color_by: $event })">
            <v-btn v-for="c in COLOR_BY" :key="c" :value="c" size="small">{{ $t(`story.colorBy.${c}`) }}</v-btn>
          </v-btn-toggle>
        </div>
        <v-switch
          :model-value="store.settings.compact"
          :label="$t('story.compact')"
          color="primary"
          density="compact"
          hide-details
          @update:model-value="store.saveSettings({ compact: !!$event })"
        />
        <v-spacer />
        <v-btn variant="text" prepend-icon="mdi-palette" @click="storylinesOpen = true">{{ $t('story.storyline.manage') }}</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="editCluster(null)">{{ $t('story.cluster.new') }}</v-btn>
      </div>

      <div class="d-flex flex-wrap align-center ga-3 mt-3">
        <v-autocomplete
          :model-value="store.settings.party_location_id"
          :items="store.locations"
          item-title="name"
          item-value="id"
          :label="$t('story.party.label')"
          prepend-inner-icon="mdi-account-group"
          variant="outlined"
          density="compact"
          clearable
          hide-details
          class="party-field"
          @update:model-value="store.saveSettings({ party_location_id: $event ?? null })"
        />
        <v-switch v-model="onlyNear" :disabled="!store.settings.party_location_id" :label="$t('story.party.onlyNear')" color="primary" density="compact" hide-details />
        <v-switch v-model="hidePlayed" :label="$t('story.hidePlayed')" color="primary" density="compact" hide-details />
      </div>

      <!-- Storyline filter: click to show only those (none selected = all) -->
      <div v-if="store.storylines.length" class="d-flex flex-wrap align-center ga-2 mt-3">
        <span class="text-body-small text-medium-emphasis mr-1">{{ $t('story.filter.storylines') }}</span>
        <v-chip
          v-for="l in storylineFilterOptions"
          :key="l.key"
          size="small"
          :color="l.color"
          :variant="storylineFilter.includes(l.key) ? 'flat' : 'outlined'"
          @click="toggleStorylineFilter(l.key)"
        >
          {{ l.label }}
        </v-chip>
        <v-btn v-if="storylineFilter.length" size="x-small" variant="text" @click="storylineFilter = []">{{ $t('story.filter.all') }}</v-btn>
      </div>

      <!-- Legend: what each color means right now -->
      <div v-if="legend.length" class="d-flex flex-wrap align-center ga-3 mt-3">
        <span class="text-body-small text-medium-emphasis">{{ $t('story.colorBy.legend') }}</span>
        <span v-for="l in legend" :key="l.key" class="d-flex align-center text-body-small">
          <span class="legend-dot mr-1" :style="{ background: `rgb(var(--v-theme-${l.color}))` }" />{{ l.label }}
        </span>
      </div>
    </v-card>

    <div class="board-layout">
      <!-- Lanes of clusters -->
      <div class="board-main">
        <div v-if="store.clusters.length === 0" class="text-center py-12 text-medium-emphasis">
          <v-icon size="56" class="mb-2">mdi-vector-square</v-icon>
          <div class="text-title-medium mb-1">{{ $t('story.empty.title') }}</div>
          <div class="text-body-medium mb-4">{{ $t('story.empty.text') }}</div>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="editCluster(null)">{{ $t('story.cluster.new') }}</v-btn>
        </div>

        <section v-for="lane in laneLists" v-else :key="lane.key" class="lane" :style="{ '--lane-color': `rgb(var(--v-theme-${lane.color}))` }">
          <button type="button" class="lane__head" :aria-expanded="!foldedLanes.includes(lane.key)" @click="toggleLane(lane.key)">
            <span class="lane__dot" />
            <span class="text-title-small font-weight-bold">{{ lane.title }}</span>
            <v-chip size="x-small" class="ml-2">{{ lane.items.length }}</v-chip>
            <v-spacer />
            <v-icon size="small" class="text-medium-emphasis">{{ foldedLanes.includes(lane.key) ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
          </button>
          <draggable
            v-show="!foldedLanes.includes(lane.key)"
            v-model="lane.items"
            item-key="id"
            group="story-clusters"
            handle=".cluster-handle"
            :animation="180"
            class="lane__grid"
            :class="{ 'lane__grid--compact': store.settings.compact, 'lane__grid--empty': !lane.items.length }"
            :data-empty-text="$t('story.lane.dropHere')"
            @start="dragging = true"
            @end="dragging = false"
            @change="onLaneChange(lane, $event)"
          >
            <template #item="{ element }">
              <div class="lane__item">
                <StoryClusterCard
                  :cluster="element"
                  :color="colorOf(element)"
                  :near="isNear(element)"
                  :faded="false"
                  :hide-played="hidePlayed"
                  :compact="store.settings.compact"
                  @edit="editCluster"
                  @delete="askDeleteCluster"
                  @edit-beat="editBeat"
                  @toggle-tray="toggleTray"
                />
              </div>
            </template>
          </draggable>
        </section>
      </div>

      <!-- Right rail: the sparks shelf (sticky-note look: loose ideas, not plans) -->
      <div class="board-rail">
        <div class="rail">
          <div class="sparks">
            <div class="d-flex align-center mb-1">
              <v-icon class="mr-2" color="warning">mdi-lightbulb-on</v-icon>
              <span class="text-title-small font-weight-bold">{{ $t('story.sparks.title') }}</span>
              <v-chip size="x-small" class="ml-2" color="warning" variant="flat">{{ store.sparks.length }}</v-chip>
            </div>
            <div class="text-body-small text-medium-emphasis mb-2">{{ $t('story.sparks.hint') }}</div>
            <v-text-field
              v-model="newSpark"
              :placeholder="$t('story.sparks.add')"
              prepend-inner-icon="mdi-plus"
              variant="solo-filled"
              flat
              density="compact"
              hide-details
              class="mb-2"
              @keyup.enter="addSpark"
            />
            <StoryBeatList :beats="sparks" :cluster-id="null" :empty-text="$t('story.sparks.empty')" @edit="editBeat" @toggle-tray="toggleTray" />
          </div>
        </div>
      </div>
    </div>

    <StoryBeatDialog v-model="beatOpen" :beat="beatEditing" />
    <StoryClusterDialog v-model="clusterOpen" :cluster="clusterEditing" />
    <StorylineManager v-model="storylinesOpen" />

    <v-dialog v-model="deleteOpen" max-width="440">
      <v-card>
        <v-card-title>{{ $t('story.cluster.deleteTitle') }}</v-card-title>
        <v-card-text>{{ $t('story.cluster.deleteText', { name: clusterDeleting?.title ?? '' }) }}</v-card-text>
        <v-card-actions class="flex-wrap">
          <v-btn variant="text" @click="deleteOpen = false">{{ $t('common.cancel') }}</v-btn>
          <v-spacer />
          <v-btn variant="text" color="error" @click="confirmDelete(true)">{{ $t('story.cluster.deleteWithBeats') }}</v-btn>
          <v-btn variant="flat" color="error" @click="confirmDelete(false)">{{ $t('story.cluster.deleteKeepBeats') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import StoryClusterCard from './StoryClusterCard.vue'
import StoryBeatList from './StoryBeatList.vue'
import StoryBeatDialog from './StoryBeatDialog.vue'
import StoryClusterDialog from './StoryClusterDialog.vue'
import StorylineManager from './StorylineManager.vue'
import {
  BEAT_KIND_ICONS, CLUSTER_HEATS, CLUSTER_STATUSES, COLOR_BY, GROUP_BY, NO_COLOR, clusterColor, heatColor, statusColor,
  type BeatKind, type StoryBeat, type StoryCluster,
} from '~~/types/story'

/**
 * The board: clusters in lanes (one per storyline / heat / region / status),
 * the next-session band on top and the sparks shelf on the side.
 */
defineEmits<{ 'open-run-sheet': [] }>()

const { t } = useI18n()
const store = useStoryBoardStore()

const onlyNear = ref(false)
const hidePlayed = ref(false)
const newSpark = ref('')
const dragging = ref(false)

// --- per-viewer conveniences (folded lanes, storyline filter) ----------
function remember<T>(name: string, fallback: T) {
  const key = computed(() => `dmhero.storyBoard.${name}.${store.campaignId}`)
  const value = ref<T>(fallback) as Ref<T>
  watch(key, (k) => {
    try {
      const raw = localStorage.getItem(k)
      value.value = raw ? JSON.parse(raw) : fallback
    }
    catch {
      value.value = fallback
    }
  }, { immediate: true })
  watch(value, (v) => {
    try {
      localStorage.setItem(key.value, JSON.stringify(v))
    }
    catch {
      // storage blocked — works for this visit
    }
  }, { deep: true })
  return value
}
const foldedLanes = remember<string[]>('foldedLanes', [])
const storylineFilter = remember<string[]>('storylineFilter', [])

function toggleLane(key: string) {
  foldedLanes.value = foldedLanes.value.includes(key) ? foldedLanes.value.filter(k => k !== key) : [...foldedLanes.value, key]
}
function toggleStorylineFilter(key: string) {
  storylineFilter.value = storylineFilter.value.includes(key) ? storylineFilter.value.filter(k => k !== key) : [...storylineFilter.value, key]
}
const storylineFilterOptions = computed(() => [
  ...store.storylines.map(s => ({ key: String(s.id), label: s.name, color: `story-${s.color}` })),
  { key: 'none', label: t('story.storyline.noneShort'), color: undefined },
])

// --- colors ------------------------------------------------------------
const regionIds = computed(() => [...new Set(store.clusters.map(c => c.location_id).filter((x): x is number => !!x))])
const colorOf = (c: StoryCluster) => clusterColor(c, store.settings.color_by, store.storylines, regionIds.value)

const legend = computed(() => {
  switch (store.settings.color_by) {
    case 'heat': return CLUSTER_HEATS.map(h => ({ key: h, color: heatColor(h), label: t(`story.heat.${h}`) }))
    case 'status': return CLUSTER_STATUSES.map(s => ({ key: s, color: statusColor(s), label: t(`story.clusterStatus.${s}`) }))
    case 'region': return regionIds.value.map(id => ({
      key: String(id),
      color: clusterColor({ location_id: id, storyline_id: null, heat: 'warm', status: 'active' }, 'region', store.storylines, regionIds.value),
      label: store.locations.find(l => l.id === id)?.name ?? '?',
    }))
    default: return store.storylines.map(s => ({ key: String(s.id), color: `story-${s.color}`, label: s.name }))
  }
})

// --- what's shown --------------------------------------------------------
function isNear(c: StoryCluster) {
  if (!store.settings.party_location_id) return false
  if (c.location_id && store.nearby.has(c.location_id)) return true
  return store.beatsOf(c.id).some(b => b.location_id && store.nearby.has(b.location_id))
}
const visibleClusters = computed(() => store.clusters.filter(c =>
  (!(onlyNear.value && store.settings.party_location_id) || isNear(c))
  && (!storylineFilter.value.length || storylineFilter.value.includes(c.storyline_id ? String(c.storyline_id) : 'none')),
))

// --- lanes -------------------------------------------------------------
type LaneValue = number | string | null
interface Lane { key: string, title: string, color: string, value: LaneValue }

const lanes = computed<Lane[]>(() => {
  switch (store.settings.group_by) {
    case 'heat':
      return (['hot', 'warm', 'cold'] as const).map(h => ({ key: h, title: t(`story.heat.${h}`), color: heatColor(h), value: h }))
    case 'status':
      return CLUSTER_STATUSES.map(s => ({ key: s, title: t(`story.clusterStatus.${s}`), color: statusColor(s), value: s }))
    case 'region':
      return [
        ...regionIds.value
          .map(id => ({ key: `loc-${id}`, title: store.locations.find(l => l.id === id)?.name ?? '?', color: clusterColor({ location_id: id, storyline_id: null, heat: 'warm', status: 'active' }, 'region', store.storylines, regionIds.value), value: id as LaneValue }))
          .sort((a, b) => a.title.localeCompare(b.title)),
        { key: 'loc-none', title: t('story.lane.noPlace'), color: NO_COLOR, value: null },
      ]
    case 'none':
      return [{ key: 'all', title: t('story.lane.all'), color: 'primary', value: null }]
    default: {
      const shown = store.storylines.filter(s => !storylineFilter.value.length || storylineFilter.value.includes(String(s.id)))
      const lines: Lane[] = shown.map(s => ({ key: `line-${s.id}`, title: s.name, color: `story-${s.color}`, value: s.id }))
      if (!storylineFilter.value.length || storylineFilter.value.includes('none')) {
        lines.push({ key: 'line-none', title: t('story.storyline.noneShort'), color: NO_COLOR, value: null })
      }
      return lines
    }
  }
})

function laneValueOf(c: StoryCluster): LaneValue {
  switch (store.settings.group_by) {
    case 'heat': return c.heat
    case 'status': return c.status
    case 'region': return c.location_id
    case 'none': return null
    default: return c.storyline_id
  }
}

// Drag lists per lane, rebuilt from the store when not dragging
const laneLists = ref<Array<Lane & { items: StoryCluster[] }>>([])
function rebuildLanes() {
  laneLists.value = lanes.value.map(l => ({ ...l, items: visibleClusters.value.filter(c => laneValueOf(c) === l.value) }))
}
watch([lanes, visibleClusters], () => {
  if (!dragging.value) rebuildLanes()
}, { immediate: true })
watch(dragging, (d) => {
  if (!d) rebuildLanes()
})

const LANE_FIELD = { storyline: 'storyline_id', heat: 'heat', status: 'status', region: 'location_id', none: null } as const

async function onLaneChange(lane: Lane & { items: StoryCluster[] }, e: { added?: { element: StoryCluster }, moved?: unknown }) {
  if (!e.added && !e.moved) return
  const field = LANE_FIELD[store.settings.group_by]
  // Dropped into another lane → it takes that lane's storyline / heat / status / place
  if (e.added && field) await store.updateCluster(e.added.element.id, { [field]: lane.value } as Partial<StoryCluster>)
  const shown = laneLists.value.flatMap(l => l.items.map(c => c.id))
  const hidden = store.clusters.filter(c => !shown.includes(c.id)).map(c => c.id)
  await store.saveOrder({ clusters: [...shown, ...hidden] })
}

// --- tray & sparks -------------------------------------------------------
const trayList = ref<StoryBeat[]>([])
watch(() => store.tray, v => (trayList.value = [...v]), { immediate: true })
function saveTray() {
  store.saveOrder({ tray: trayList.value.map(b => b.id) })
}

const sparks = computed(() => (hidePlayed.value ? store.sparks.filter(b => b.status !== 'played' && b.status !== 'cut') : store.sparks))

async function addSpark() {
  const title = newSpark.value.trim()
  if (!title) return
  newSpark.value = ''
  await store.addBeat({ title, kind: 'hook' })
}

async function toggleTray(beat: StoryBeat) {
  await store.updateBeat(beat.id, { in_tray: beat.tray_order === null })
}

// --- dialogs -----------------------------------------------------------
const beatOpen = ref(false)
const beatEditing = ref<StoryBeat | null>(null)
function editBeat(beat: StoryBeat) {
  beatEditing.value = beat
  beatOpen.value = true
}

const clusterOpen = ref(false)
const clusterEditing = ref<StoryCluster | null>(null)
function editCluster(cluster: StoryCluster | null) {
  clusterEditing.value = cluster
  clusterOpen.value = true
}

const storylinesOpen = ref(false)

const deleteOpen = ref(false)
const clusterDeleting = ref<StoryCluster | null>(null)
function askDeleteCluster(cluster: StoryCluster) {
  clusterDeleting.value = cluster
  deleteOpen.value = true
}
async function confirmDelete(withBeats: boolean) {
  if (clusterDeleting.value) await store.deleteCluster(clusterDeleting.value.id, withBeats)
  deleteOpen.value = false
}
</script>

<style scoped>
.board-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 16px;
  container-type: inline-size;
}
/* Narrow space (side panel open, small window): the rail goes below */
@container (max-width: 760px) {
  .board-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Next-session band */
.tray-band {
  border: 1px solid rgba(var(--v-theme-primary), 0.5);
}
.tray-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tray-item {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 4px 4px 10px;
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-primary), 0.4);
  cursor: grab;
  max-width: 100%;
}
.tray-item__num {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.tray-item__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}

/* Lanes */
.lane {
  margin-bottom: 16px;
  border-left: 4px solid var(--lane-color);
  padding-left: 12px;
}
.lane__head {
  display: flex;
  align-items: center;
  width: 100%;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
  padding: 4px 0 8px;
  text-align: left;
}
.lane__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--lane-color);
  margin-right: 8px;
}
/* Masonry: cards stack in columns with no row gaps */
.lane__grid {
  columns: 320px;
  column-gap: 16px;
  min-height: 48px;
}
.lane__grid--compact {
  columns: 240px;
}
.lane__item {
  break-inside: avoid;
  margin-bottom: 16px;
}
.lane__grid--compact .lane__item {
  margin-bottom: 8px;
}
.lane__grid--empty {
  columns: auto;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lane__grid--empty::after {
  content: attr(data-empty-text);
  font-size: 0.8rem;
  opacity: 0.6;
  padding: 12px;
}

/* Sparks: sticky-note look */
.rail {
  position: sticky;
  top: 72px;
}
.sparks {
  background: rgba(var(--v-theme-warning), 0.12);
  border: 2px dashed rgba(var(--v-theme-warning), 0.6);
  border-radius: 12px;
  padding: 12px;
}

.party-field {
  min-width: 220px;
  max-width: 300px;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}
</style>
