<template>
  <div>
    <!-- Next session: one slim strip of chips, in your order (drag to reorder). Click a chip to read it here. -->
    <div class="strip mb-3">
      <div class="strip__bar">
        <v-icon color="primary" size="small">mdi-calendar-star</v-icon>
        <span class="text-body-medium font-weight-bold text-no-wrap">{{ $t('story.tray.title') }}</span>
        <v-chip size="x-small" color="primary" variant="flat">{{ store.tray.length }}</v-chip>
        <div class="strip__chips">
          <span v-if="!store.tray.length" class="text-body-small text-medium-emphasis">{{ $t('story.tray.empty') }}</span>
          <draggable v-model="trayList" item-key="id" :animation="180" class="strip__list" @change="saveTray">
            <template #item="{ element, index }">
              <button
                type="button"
                class="strip__chip"
                :class="{ 'strip__chip--open': stripOpen === element.id }"
                :style="{ '--group-color': colorCss(beatColor(element)) }"
                :title="[element.title, clusterTitle(element)].filter(Boolean).join(' · ')"
                @click="stripOpen = stripOpen === element.id ? null : element.id"
              >
                <span class="strip__num">{{ index + 1 }}</span>
                <v-icon size="x-small" class="strip__icon">{{ BEAT_KIND_ICONS[element.kind as BeatKind] }}</v-icon>
                <span class="strip__title">{{ element.title }}</span>
              </button>
            </template>
          </draggable>
        </div>
        <v-btn variant="text" size="small" prepend-icon="mdi-flag-checkered" :disabled="!store.tray.length" @click="wrapOpen = true">{{ $t('story.wrap.open') }}</v-btn>
        <v-btn color="primary" variant="flat" size="small" prepend-icon="mdi-format-list-numbered" :disabled="!store.tray.length" @click="$emit('open-run-sheet')">
          {{ $t('story.run.open') }}
        </v-btn>
      </div>
      <!-- The opened chip, read in place -->
      <div v-if="openBeat" class="strip__detail" :style="{ '--group-color': colorCss(beatColor(openBeat)) }">
        <div class="d-flex align-center ga-2 mb-1">
          <v-icon size="small">{{ BEAT_KIND_ICONS[openBeat.kind as BeatKind] }}</v-icon>
          <span class="text-title-small font-weight-bold">{{ openBeat.title }}</span>
          <span class="text-body-small text-medium-emphasis">{{ clusterTitle(openBeat) }}</span>
          <v-spacer />
          <v-btn icon="mdi-pencil" size="x-small" variant="text" :aria-label="$t('common.edit')" @click="editBeat(openBeat)" />
          <v-btn icon="mdi-calendar-remove" size="x-small" variant="text" :title="$t('story.tray.remove')" :aria-label="$t('story.tray.remove')" @click="toggleTray(openBeat); stripOpen = null" />
          <v-btn icon="mdi-close" size="x-small" variant="text" :aria-label="$t('common.close')" @click="stripOpen = null" />
        </div>
        <SharedFormattedText v-if="openBeat.body" :text="openBeat.body" class="text-body-medium" />
        <div v-else-if="!openBeat.location_name && !openBeat.entities.length" class="text-body-small text-medium-emphasis">{{ $t('story.beat.noDetails') }}</div>
        <div v-if="openBeat.location_name || openBeat.entities.length" class="d-flex flex-wrap ga-1 mt-1">
          <v-chip v-if="openBeat.location_name" size="x-small" variant="tonal" color="green" prepend-icon="mdi-map-marker">
            <SharedEntityLink :id="openBeat.location_id" type="Location" :name="openBeat.location_name" />
          </v-chip>
          <v-chip v-for="e in openBeat.entities" :key="e.id" size="x-small" variant="tonal">
            <SharedEntityLink :id="e.id" :type="e.type" :name="e.name" />
          </v-chip>
        </div>
      </div>
    </div>

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
        <v-switch v-model="focus" :label="$t('story.focus.label')" color="error" density="compact" hide-details :title="$t('story.focus.hint')" />
        <v-spacer />
        <v-btn variant="text" prepend-icon="mdi-archive-outline" @click="archiveOpen = true">
          {{ $t('story.archive.title') }}<v-chip v-if="archiveCount" size="x-small" class="ml-1">{{ archiveCount }}</v-chip>
        </v-btn>
        <v-btn variant="text" prepend-icon="mdi-palette" @click="storylinesOpen = true">{{ $t('story.storyline.manage') }}</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="editCluster(null)">{{ $t('story.cluster.new') }}</v-btn>
      </div>

      <div v-show="!focus" class="d-flex flex-wrap align-center ga-3 mt-3">
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
        <v-switch v-model="onlyArmed" :disabled="!store.settings.party_location_id" color="warning" density="compact" hide-details>
          <template #label>{{ $t('story.trigger.onlyArmed') }}<v-chip v-if="armedCount" size="x-small" color="warning" variant="flat" class="ml-1">{{ armedCount }}</v-chip></template>
        </v-switch>
        <!-- Which beats show: idea / ready / played / cut -->
        <div class="d-flex align-center flex-wrap ga-1">
          <span class="text-body-small text-medium-emphasis mr-1">{{ $t('story.filter.statuses') }}</span>
          <v-chip
            v-for="st in BEAT_STATUSES"
            :key="st"
            size="small"
            :variant="shownStatuses.includes(st) ? 'flat' : 'outlined'"
            :color="shownStatuses.includes(st) ? 'primary' : undefined"
            @click="toggleStatus(st)"
          >
            {{ $t(`story.beatStatus.${st}`) }}
          </v-chip>
          <v-btn v-if="shownStatuses.length !== BEAT_STATUSES.length" size="x-small" variant="text" @click="shownStatuses = [...BEAT_STATUSES]">{{ $t('story.filter.all') }}</v-btn>
        </div>
      </div>

      <!-- Player chips: everything one champion is tied to, across every cluster -->
      <div v-if="store.players.length && !focus" class="d-flex flex-wrap align-center ga-2 mt-3">
        <span class="text-body-small text-medium-emphasis mr-1">{{ $t('story.players.label') }}</span>
        <v-chip
          v-for="p in store.players"
          :key="p.id"
          size="small"
          :variant="playerFilter === p.id ? 'flat' : 'outlined'"
          :color="playerFilter === p.id ? 'primary' : undefined"
          prepend-icon="mdi-account-star"
          @click="playerFilter = playerFilter === p.id ? null : p.id"
        >
          {{ p.name }}
        </v-chip>
      </div>

      <!-- Storyline filter: click to show only those (none selected = all). Folds to just the picked ones. -->
      <div v-if="store.storylines.length && !focus" class="d-flex flex-wrap align-center ga-2 mt-3">
        <v-btn
          size="small"
          variant="text"
          class="text-none px-1"
          :append-icon="linesExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          :aria-expanded="linesExpanded"
          @click="linesExpanded = !linesExpanded"
        >
          {{ $t('story.filter.storylines') }} ({{ storylineFilterOptions.length }})
        </v-btn>
        <span v-if="!linesExpanded && !storylineFilter.length" class="text-body-small text-medium-emphasis">{{ $t('story.filter.showingAll') }}</span>
        <v-chip
          v-for="l in shownLineChips"
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
      <div v-if="legend.length && !focus" class="d-flex flex-wrap align-center ga-3 mt-3">
        <v-btn
          size="small"
          variant="text"
          class="text-none px-1"
          :append-icon="legendExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          :aria-expanded="legendExpanded"
          @click="legendExpanded = !legendExpanded"
        >
          {{ $t('story.colorBy.legend') }}
        </v-btn>
        <span v-for="l in (legendExpanded ? legend : [])" :key="l.key" class="d-flex align-center text-body-small">
          <span class="legend-dot mr-1" :style="{ background: colorCss(l.color) }" />{{ l.label }}
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

        <template v-for="lane in laneLists" v-else :key="lane.key">
          <div v-if="lane.band" class="band-head">
            <v-icon size="small">{{ lane.band === 'champion' ? 'mdi-shield-crown' : 'mdi-earth' }}</v-icon>
            {{ $t(`story.storyline.band.${lane.band}`) }}
          </div>
          <section class="lane" :class="{ 'lane--champion': lane.kind === 'champion' }" :style="{ '--lane-color': colorCss(lane.color) }">
            <button type="button" class="lane__head" :aria-expanded="!foldedLanes.includes(lane.key)" @click="toggleLane(lane.key)">
              <span class="lane__dot" />
              <span class="text-title-small font-weight-bold">{{ lane.title }}</span>
              <v-chip v-if="lane.player" size="x-small" variant="tonal" color="warning" class="ml-2" prepend-icon="mdi-account-star">{{ lane.player }}</v-chip>
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
                    :statuses="shownStatuses"
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
        </template>
      </div>

      <!-- Right rail: the sparks shelf (sticky-note look: loose ideas, not plans) -->
      <div class="board-rail">
        <div class="rail">
          <v-btn-toggle v-model="railTab" mandatory density="compact" variant="outlined" divided class="mb-2 rail__tabs">
            <v-btn value="sparks" size="small" prepend-icon="mdi-lightbulb-on">{{ $t('story.sparks.title') }}<v-chip size="x-small" class="ml-1" variant="flat" color="warning">{{ store.sparks.length }}</v-chip></v-btn>
            <v-btn value="places" size="small" prepend-icon="mdi-storefront-outline">{{ $t('story.places.title') }}</v-btn>
          </v-btn-toggle>
          <div v-if="railTab === 'sparks'" class="sparks">
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
          <div v-else class="places">
            <div class="text-body-small text-medium-emphasis mb-2">{{ $t('story.places.hint') }}</div>
            <StoryPlaceKits />
          </div>
        </div>
      </div>
    </div>

    <StoryBeatDialog v-model="beatOpen" :beat="beatEditing" />
    <StoryClusterDialog v-model="clusterOpen" :cluster="clusterEditing" />
    <StorylineManager v-model="storylinesOpen" />
    <StoryArchiveDialog v-model="archiveOpen" />
    <StorySessionWrap v-model="wrapOpen" @drifted="driftText = $event; driftOpen = true" />
    <v-snackbar v-model="driftOpen" :timeout="9000" location="bottom">
      <v-icon start>mdi-thermometer</v-icon>{{ $t('story.drift.moved') }} {{ driftText }}
    </v-snackbar>

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
import StoryArchiveDialog from './StoryArchiveDialog.vue'
import StorySessionWrap from './StorySessionWrap.vue'
import StoryPlaceKits from './StoryPlaceKits.vue'
import {
  BEAT_STATUSES,
  colorCss, storylineColor,
  BEAT_KIND_ICONS, isArmed, CLUSTER_HEATS, CLUSTER_STATUSES, COLOR_BY, GROUP_BY, NO_COLOR, clusterColor, heatColor, statusColor,
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
const onlyArmed = ref(false)
const driftOpen = ref(false)
const driftText = ref('')
const newSpark = ref('')
const dragging = ref(false)

// --- per-viewer conveniences (folded lanes, storyline filter) ----------
function remember<T>(name: string, fallback: T) {
  return useStoryPref<T>(name, fallback)
}
const foldedLanes = remember<string[]>('foldedLanes', [])
/** Focus: only the hot clusters and the strip, filters tucked away */
const focus = remember<boolean>('focus', false)
const playerFilter = remember<number | null>('playerFilter', null)
const storylineFilter = remember<string[]>('storylineFilter', [])
const shownStatuses = remember<string[]>('statuses', [...BEAT_STATUSES])
function toggleStatus(st: string) {
  const next = shownStatuses.value.includes(st) ? shownStatuses.value.filter(x => x !== st) : [...shownStatuses.value, st]
  shownStatuses.value = next.length ? next : [...BEAT_STATUSES]
}

function toggleLane(key: string) {
  foldedLanes.value = foldedLanes.value.includes(key) ? foldedLanes.value.filter(k => k !== key) : [...foldedLanes.value, key]
}
function toggleStorylineFilter(key: string) {
  storylineFilter.value = storylineFilter.value.includes(key) ? storylineFilter.value.filter(k => k !== key) : [...storylineFilter.value, key]
}
const storylineFilterOptions = computed(() => [
  ...store.storylines.map(s => ({ key: String(s.id), label: s.name, color: storylineColor(s) })),
  { key: 'none', label: t('story.storyline.noneShort'), color: undefined },
])
// Folded: only the storylines you've picked stay visible
const linesExpanded = remember<boolean>('linesExpanded', false)
const legendExpanded = remember<boolean>('legendExpanded', false)
const shownLineChips = computed(() => linesExpanded.value ? storylineFilterOptions.value : storylineFilterOptions.value.filter(l => storylineFilter.value.includes(l.key)))

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
    default: return store.storylines.map(s => ({ key: String(s.id), color: storylineColor(s), label: s.name }))
  }
})

// --- what's shown --------------------------------------------------------
function isNear(c: StoryCluster) {
  if (!store.settings.party_location_id) return false
  if (c.location_id && store.nearby.has(c.location_id)) return true
  return store.beatsOf(c.id).some(b => b.location_id && store.nearby.has(b.location_id))
}
const armedCount = computed(() => store.beats.filter(b => isArmed(b, store.nearby)).length)
const hasArmed = (c: StoryCluster) => store.beatsOf(c.id).some(b => isArmed(b, store.nearby))
/** Tied to a player: their champion storyline, or they're linked on the cluster or one of its beats */
function involvesPlayer(c: StoryCluster, id: number) {
  if (store.storylines.find(l => l.id === c.storyline_id)?.player_id === id) return true
  if (c.entities?.some(e => e.id === id)) return true
  return store.beatsOf(c.id).some(b => b.entities.some(e => e.id === id))
}
const visibleClusters = computed(() => store.clusters.filter(c =>
  (!focus.value || c.heat === 'hot')
  && (!playerFilter.value || involvesPlayer(c, playerFilter.value))
  && (!(onlyArmed.value && store.settings.party_location_id) || hasArmed(c))
  && (!(onlyNear.value && store.settings.party_location_id) || isNear(c))
  && (!storylineFilter.value.length || storylineFilter.value.includes(c.storyline_id ? String(c.storyline_id) : 'none')),
))

// --- lanes -------------------------------------------------------------
type LaneValue = number | string | null
interface Lane { key: string, title: string, color: string, value: LaneValue, kind?: 'world' | 'champion', band?: 'world' | 'champion', player?: string }

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
      const lane = (l: typeof shown[number]): Lane => ({
        key: `line-${l.id}`,
        title: l.name,
        color: storylineColor(l),
        value: l.id,
        kind: l.kind === 'champion' ? 'champion' : 'world',
        player: l.kind === 'champion' ? store.players.find(p => p.id === l.player_id)?.name : undefined,
      })
      // The main arc first, then each player's champion line
      const world: Lane[] = shown.filter(l => l.kind !== 'champion').map(lane)
      if (!storylineFilter.value.length || storylineFilter.value.includes('none')) {
        world.push({ key: 'line-none', title: t('story.storyline.noneShort'), color: NO_COLOR, value: null, kind: 'world' })
      }
      const champions: Lane[] = shown.filter(l => l.kind === 'champion').map(lane)
      if (champions.length) {
        if (world.length) world[0] = { ...world[0]!, band: 'world' }
        champions[0] = { ...champions[0]!, band: 'champion' }
      }
      return [...world, ...champions]
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
// The one chip read in place under the strip (opening never moves anything)
const stripOpen = ref<number | null>(null)
const openBeat = computed(() => store.tray.find(b => b.id === stripOpen.value) ?? null)
const wrapOpen = ref(false)
const railTab = remember<'sparks' | 'places'>('railTab', 'sparks')
const clusterOfBeat = (b: StoryBeat) => (b.cluster_id ? store.clusters.find(c => c.id === b.cluster_id) ?? null : null)
const clusterTitle = (b: StoryBeat) => clusterOfBeat(b)?.title ?? ''
const beatColor = (b: StoryBeat) => {
  const c = clusterOfBeat(b)
  return c ? colorOf(c) : NO_COLOR
}

const sparks = computed(() => store.sparks.filter(b => shownStatuses.value.includes(b.status)))

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
const archiveOpen = ref(false)
const archiveCount = computed(() => store.archivedClusters.length + store.archivedBeats.length + store.quests.filter(q => q.archived).length)

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

/* Next-session strip: one line of chips */
.strip {
  border: 1px solid rgba(var(--v-theme-primary), 0.45);
  background: rgba(var(--v-theme-primary), 0.06);
  border-radius: 10px;
}
.strip__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  min-width: 0;
}
.strip__chips {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}
.strip__list {
  display: flex;
  gap: 4px;
  padding: 2px 0;
}
.strip__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  max-width: 220px;
  padding: 2px 8px 2px 6px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-left: 3px solid var(--group-color);
  background: rgb(var(--v-theme-surface));
  color: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.strip__chip:hover,
.strip__chip:focus-visible {
  background: rgba(var(--v-theme-on-surface), 0.06);
  outline: none;
}
.strip__chip--open {
  border-color: rgb(var(--v-theme-primary));
  border-left-color: var(--group-color);
  background: rgba(var(--v-theme-primary), 0.12);
}
.strip__num {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.strip__icon {
  opacity: 0.7;
}
.strip__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.strip__detail {
  border-top: 1px solid rgba(var(--v-theme-primary), 0.25);
  border-left: 3px solid var(--group-color);
  margin: 0 8px 8px;
  padding: 8px 10px 4px;
  max-width: 90ch;
  line-height: 1.5;
}

/* Lanes */
.band-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 10px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
}
.lane--champion {
  border-left-style: dashed;
}
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
.rail__tabs {
  width: 100%;
}
.rail__tabs .v-btn {
  flex: 1;
}
.places {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  padding: 12px;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
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
