<template>
  <v-card
    class="cluster-card"
    :class="{ 'cluster-card--near': near, 'cluster-card--faded': faded, 'cluster-card--compact': compact }"
    :style="{ '--cluster-color': colorCss(color) }"
    variant="flat"
    border
  >
    <div class="cluster-card__bar" />
    <div class="d-flex align-center px-2 pt-2">
      <v-icon class="cluster-handle mr-1 text-medium-emphasis" size="small">mdi-drag</v-icon>
      <v-btn
        v-if="!compact"
        :icon="cluster.collapsed ? 'mdi-chevron-right' : 'mdi-chevron-down'"
        :aria-label="cluster.collapsed ? $t('story.cluster.expand') : $t('story.cluster.collapse')"
        variant="text"
        size="x-small"
        @click="store.updateCluster(cluster.id, { collapsed: !cluster.collapsed })"
      />
      <span
        class="text-title-small font-weight-bold flex-grow-1 cluster-title"
        role="button"
        tabindex="0"
        :title="cluster.collapsed ? $t('story.cluster.expand') : $t('story.cluster.collapse')"
        @click="toggle"
        @keydown.enter="toggle"
      >
        {{ cluster.title }}
      </span>
      <span v-if="cluster.clock_size" class="mr-1 d-inline-flex" :title="cluster.clock_label || $t('story.clock.title')">
        <ClockDial :size="cluster.clock_size" :filled="cluster.clock_filled ?? 0" :diameter="26" color="warning" @update:filled="store.updateCluster(cluster.id, { clock_filled: $event })" />
      </span>
      <v-chip size="x-small" variant="tonal" class="mr-1" :title="$t('story.cluster.progress')">
        {{ playedCount }}/{{ beats.length }}
      </v-chip>
      <v-btn icon="mdi-pencil" variant="text" size="x-small" :title="$t('common.edit')" :aria-label="$t('common.edit')" @click="$emit('edit', cluster)" />
      <v-menu>
        <template #activator="{ props: menu }">
          <v-btn v-bind="menu" icon="mdi-dots-vertical" variant="text" size="x-small" :aria-label="$t('common.actions')" />
        </template>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-pencil" :title="$t('common.edit')" @click="$emit('edit', cluster)" />
          <v-list-item
            :prepend-icon="inTray ? 'mdi-calendar-remove' : 'mdi-calendar-plus'"
            :title="inTray ? $t('story.map.outOfNext') : $t('story.map.intoNext')"
            @click="store.clusterToTray(cluster.id, !inTray)"
          />
          <v-list-item
            :prepend-icon="cluster.heat_pinned ? 'mdi-pin-off' : 'mdi-pin'"
            :title="cluster.heat_pinned ? $t('story.drift.unpin') : $t('story.drift.pin')"
            @click="store.updateCluster(cluster.id, { heat_pinned: !cluster.heat_pinned })"
          />
          <v-list-item v-if="!cluster.quest_id" prepend-icon="mdi-script-text-outline" :title="$t('story.quest.make')" @click="makeQuest" />
          <v-list-item prepend-icon="mdi-archive-arrow-down-outline" :title="$t('story.archive.put')" @click="store.updateCluster(cluster.id, { archived: true })" />
          <v-list-item prepend-icon="mdi-delete" base-color="error" :title="$t('common.delete')" @click="$emit('delete', cluster)" />
        </v-list>
      </v-menu>
    </div>

    <!-- What this cluster is: storyline, heat, status, place, quest -->
    <div v-if="!compact || peek" class="d-flex flex-wrap ga-1 px-3 pb-2">
      <v-chip v-if="storyline" size="x-small" :color="storylineColor(storyline)" variant="flat">{{ storyline.name }}</v-chip>
      <v-chip size="x-small" :color="heatColor(cluster.heat)" variant="tonal">
        <v-icon start size="x-small">{{ HEAT_ICONS[cluster.heat] }}</v-icon>{{ $t(`story.heat.${cluster.heat}`) }}
        <v-icon v-if="cluster.heat_pinned" end size="x-small" :title="$t('story.drift.pinned')">mdi-pin</v-icon>
      </v-chip>
      <v-chip v-if="cluster.status !== 'active'" size="x-small" variant="tonal">{{ $t(`story.clusterStatus.${cluster.status}`) }}</v-chip>
      <v-chip v-if="cluster.location_name" size="x-small" variant="tonal" color="green">
        <v-icon start size="x-small">mdi-map-marker</v-icon>
        <SharedEntityLink :id="cluster.location_id" type="Location" :name="cluster.location_name" />
      </v-chip>
      <v-chip v-if="cluster.quest_name" size="x-small" variant="tonal">
        <v-icon start size="x-small">mdi-script-text</v-icon>
        <SharedEntityLink :id="cluster.quest_id" type="quest" :name="cluster.quest_name" />
      </v-chip>
      <v-chip v-if="near" size="x-small" color="primary" variant="flat">
        <v-icon start size="x-small">mdi-account-group</v-icon>{{ $t('story.party.near') }}
      </v-chip>
    </div>

    <!-- Who and what is involved across the whole cluster (new beats start with these) -->
    <div v-if="(!compact || peek) && cluster.entities?.length" class="d-flex flex-wrap align-center ga-1 px-3 pb-2">
      <v-icon size="x-small" class="text-medium-emphasis" :title="$t('story.cluster.involved')">mdi-account-multiple</v-icon>
      <v-chip v-for="e in cluster.entities" :key="e.id" size="x-small" variant="outlined">
        <SharedEntityLink :id="e.id" :type="e.type" :name="e.name" />
      </v-chip>
    </div>

    <v-expand-transition>
      <div v-show="compact ? peek : !cluster.collapsed" class="px-2 pb-2">
        <div v-if="cluster.notes" class="text-body-small text-medium-emphasis px-2 pb-2 cluster-notes">{{ cluster.notes }}</div>
        <StoryBeatList
          :beats="shownLive"
          :cluster-id="cluster.id"
          :empty-text="$t('story.cluster.dropHere')"
          @edit="$emit('edit-beat', $event)"
          @toggle-tray="$emit('toggle-tray', $event)"
        />
        <!-- Only the next few beats show; the rest wait one click away -->
        <button v-if="hiddenLive" type="button" class="more" :aria-expanded="moreOpen" @click="toggleMore">
          <v-icon size="x-small">{{ moreOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          {{ moreOpen ? $t('story.fold.less') : $t('story.fold.more', { n: hiddenLive }) }}
        </button>
        <!-- Played & cut: folded away at the bottom, one click to put a beat back -->
        <div v-if="doneBeats.length" class="done">
          <button type="button" class="done__toggle" :aria-expanded="doneOpen" @click="toggleDone">
            <v-icon size="x-small">{{ doneOpen ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
            <v-icon size="x-small" color="success">mdi-check-all</v-icon>
            {{ $t('story.done.title', { n: doneBeats.length }) }}
          </button>
          <div v-if="doneOpen" class="done__list">
            <div v-for="b in doneBeats" :key="b.id" class="done__row" :class="{ 'done__row--cut': b.status === 'cut' }">
              <v-icon size="x-small" :color="b.status === 'cut' ? undefined : 'success'">{{ b.status === 'cut' ? 'mdi-close' : 'mdi-check' }}</v-icon>
              <span class="done__title" role="button" tabindex="0" @click="$emit('edit-beat', b)" @keydown.enter="$emit('edit-beat', b)">{{ b.title }}</span>
              <v-btn size="x-small" variant="text" prepend-icon="mdi-restore" class="done__restore" @click="restore(b)">{{ $t('story.run.restore') }}</v-btn>
            </div>
          </div>
        </div>
        <v-text-field
          v-model="newBeat"
          :placeholder="$t('story.beat.quickAdd')"
          prepend-inner-icon="mdi-plus"
          variant="plain"
          density="compact"
          hide-details
          class="px-2"
          @keyup.enter="addBeat"
        />
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
import StoryBeatList from './StoryBeatList.vue'
import ClockDial from './ClockDial.vue'
import { colorCss, heatColor, storylineColor, type ClusterHeat, type StoryBeat, type StoryCluster } from '~~/types/story'

/** A folding cluster of beats, color-coded by the board's color-by parameter. */
const props = defineProps<{ cluster: StoryCluster, color: string, near: boolean, faded: boolean, statuses?: string[], compact?: boolean }>()
defineEmits<{
  'edit': [cluster: StoryCluster]
  'delete': [cluster: StoryCluster]
  'edit-beat': [beat: StoryBeat]
  'toggle-tray': [beat: StoryBeat]
}>()

const HEAT_ICONS: Record<ClusterHeat, string> = { cold: 'mdi-snowflake', warm: 'mdi-weather-sunny', hot: 'mdi-fire' }

const store = useStoryBoardStore()
// The board's drag list may hold an older copy; always show the store's current one
const cluster = computed(() => store.clusters.find(c => c.id === props.cluster.id) ?? props.cluster)
const storyline = computed(() => store.storylines.find(s => s.id === cluster.value.storyline_id) ?? null)
const beats = computed(() => store.beatsOf(cluster.value.id))
const visibleBeats = computed(() => (props.statuses ? beats.value.filter(b => props.statuses!.includes(b.status)) : beats.value))
const isDone = (b: StoryBeat) => b.status === 'played' || b.status === 'cut'
const liveBeats = computed(() => visibleBeats.value.filter(b => !isDone(b)))
const doneBeats = computed(() => visibleBeats.value.filter(isDone))
/** Show the next two live beats; fold the rest when there are more than three */
const FOLD_AT = 2
const moreIds = useStoryPref<number[]>('moreOpen', [])
const moreOpen = computed(() => moreIds.value.includes(cluster.value.id))
const hiddenLive = computed(() => (liveBeats.value.length > FOLD_AT + 1 && !moreOpen.value ? liveBeats.value.length - FOLD_AT : (moreOpen.value && liveBeats.value.length > FOLD_AT + 1 ? -1 : 0)))
const shownLive = computed(() => (hiddenLive.value > 0 ? liveBeats.value.slice(0, FOLD_AT) : liveBeats.value))
function toggleMore() {
  const id = cluster.value.id
  moreIds.value = moreOpen.value ? moreIds.value.filter(x => x !== id) : [...moreIds.value, id]
}
const doneOpenIds = useStoryPref<number[]>('doneOpen', [])
const doneOpen = computed(() => doneOpenIds.value.includes(cluster.value.id))
function toggleDone() {
  const id = cluster.value.id
  doneOpenIds.value = doneOpen.value ? doneOpenIds.value.filter(x => x !== id) : [...doneOpenIds.value, id]
}
/** The party now knows about this thread: make a quest for it (a rumor until something here is played) */
async function makeQuest() {
  const q = await store.saveQuest(null, { name: cluster.value.title, description: cluster.value.notes, status: 'rumor' })
  await store.updateCluster(cluster.value.id, { quest_id: q.id })
}
async function restore(b: StoryBeat) {
  await store.updateBeat(b.id, { status: 'ready', played_session_id: null })
}
const inTray = computed(() => beats.value.some(b => b.tray_order != null))
const playedCount = computed(() => beats.value.filter(b => b.status === 'played').length)

// Title click: compact view shows the beats for a moment; otherwise fold / unfold
const peek = ref(false)
function toggle() {
  if (props.compact) peek.value = !peek.value
  else store.updateCluster(cluster.value.id, { collapsed: !cluster.value.collapsed })
}

const newBeat = ref('')
async function addBeat() {
  const title = newBeat.value.trim()
  if (!title) return
  newBeat.value = ''
  await store.addBeat({ title, cluster_id: cluster.value.id })
}
</script>

<style scoped>
.cluster-card {
  border-left: 5px solid var(--cluster-color) !important;
  overflow: visible;
  transition: opacity 0.2s, box-shadow 0.2s;
}
.cluster-card__bar {
  height: 4px;
  background: var(--cluster-color);
  opacity: 0.35;
}
.cluster-card--near {
  box-shadow: 0 0 0 2px rgb(var(--v-theme-primary));
}
.cluster-card--compact {
  padding-bottom: 6px;
}
.cluster-card--faded {
  opacity: 0.45;
}
.cluster-handle {
  cursor: grab;
}
.cluster-title {
  cursor: pointer;
}
.more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 0;
  color: rgb(var(--v-theme-primary));
  font-size: 0.8rem;
  cursor: pointer;
  padding: 2px 8px;
}
.done {
  margin-top: 4px;
  padding: 0 4px;
}
.done__toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 0;
  color: inherit;
  font-size: 0.8rem;
  opacity: 0.7;
  cursor: pointer;
  padding: 2px 4px;
}
.done__toggle:hover {
  opacity: 1;
}
.done__row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  padding: 1px 4px 1px 18px;
  opacity: 0.75;
}
.done__row--cut .done__title {
  text-decoration: line-through;
}
.done__title {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.done__restore {
  opacity: 0;
}
.done__row:hover .done__restore,
.done__row:focus-within .done__restore {
  opacity: 1;
}
.cluster-notes {
  white-space: pre-line;
}
</style>
