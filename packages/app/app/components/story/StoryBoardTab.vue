<template>
  <div>
    <!-- Toolbar: how to color, where the party is, filters -->
    <v-card variant="tonal" class="pa-3 mb-3">
      <div class="d-flex flex-wrap align-center ga-3">
        <div class="d-flex align-center ga-2">
          <span class="text-body-small text-medium-emphasis">{{ $t('story.colorBy.label') }}</span>
          <v-btn-toggle :model-value="store.settings.color_by" mandatory density="compact" variant="outlined" divided @update:model-value="store.saveSettings({ color_by: $event })">
            <v-btn v-for="c in COLOR_BY" :key="c" :value="c" size="small">{{ $t(`story.colorBy.${c}`) }}</v-btn>
          </v-btn-toggle>
        </div>

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

        <v-spacer />
        <v-btn variant="text" prepend-icon="mdi-palette" @click="storylinesOpen = true">{{ $t('story.storyline.manage') }}</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="editCluster(null)">{{ $t('story.cluster.new') }}</v-btn>
      </div>

      <!-- Legend: what each color means right now -->
      <div v-if="legend.length" class="d-flex flex-wrap align-center ga-3 mt-3">
        <span v-for="l in legend" :key="l.key" class="d-flex align-center text-body-small">
          <span class="legend-dot mr-1" :style="{ background: `rgb(var(--v-theme-${l.color}))` }" />{{ l.label }}
        </span>
      </div>
    </v-card>

    <div class="board-layout">
      <!-- Clusters -->
      <div class="board-main">
        <div v-if="store.clusters.length === 0" class="text-center py-12 text-medium-emphasis">
          <v-icon size="56" class="mb-2">mdi-vector-square</v-icon>
          <div class="text-title-medium mb-1">{{ $t('story.empty.title') }}</div>
          <div class="text-body-medium mb-4">{{ $t('story.empty.text') }}</div>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="editCluster(null)">{{ $t('story.cluster.new') }}</v-btn>
        </div>
        <draggable
          v-else
          v-model="clusterList"
          item-key="id"
          handle=".cluster-handle"
          :animation="180"
          class="cluster-grid"
          @change="saveClusterOrder"
        >
          <template #item="{ element }">
            <StoryClusterCard
              :cluster="element"
              :color="colorOf(element)"
              :near="isNear(element)"
              :faded="false"
              :hide-played="hidePlayed"
              @edit="editCluster"
              @delete="askDeleteCluster"
              @edit-beat="editBeat"
              @toggle-tray="toggleTray"
            />
          </template>
        </draggable>
      </div>

      <!-- Right rail: next session tray + sparks shelf -->
      <div class="board-rail">
        <div class="rail">
          <v-card variant="outlined" class="mb-3">
            <v-card-title class="d-flex align-center text-title-small">
              <v-icon class="mr-2" color="primary">mdi-calendar-star</v-icon>{{ $t('story.tray.title') }}
              <v-chip size="x-small" class="ml-2">{{ store.tray.length }}</v-chip>
              <v-spacer />
              <v-btn size="small" variant="text" :disabled="!store.tray.length" @click="$emit('open-run-sheet')">{{ $t('story.run.open') }}</v-btn>
            </v-card-title>
            <v-card-text class="pt-0">
              <div v-if="!store.tray.length" class="text-body-small text-medium-emphasis">{{ $t('story.tray.empty') }}</div>
              <draggable v-model="trayList" item-key="id" handle=".beat-handle" :animation="180" @change="saveTray">
                <template #item="{ element, index }">
                  <div class="d-flex align-center tray-row">
                    <span class="tray-num text-body-small mr-1">{{ index + 1 }}</span>
                    <StoryBeatRow :beat="element" :max-chips="1" class="flex-grow-1" @edit="editBeat" @toggle-tray="toggleTray" />
                  </div>
                </template>
              </draggable>
            </v-card-text>
          </v-card>

          <v-card variant="outlined">
            <v-card-title class="d-flex align-center text-title-small">
              <v-icon class="mr-2" color="warning">mdi-creation</v-icon>{{ $t('story.sparks.title') }}
              <v-chip size="x-small" class="ml-2">{{ store.sparks.length }}</v-chip>
            </v-card-title>
            <v-card-subtitle class="text-wrap pb-2">{{ $t('story.sparks.hint') }}</v-card-subtitle>
            <v-card-text class="pt-0">
              <v-text-field
                v-model="newSpark"
                :placeholder="$t('story.sparks.add')"
                prepend-inner-icon="mdi-lightbulb-on-outline"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-2"
                @keyup.enter="addSpark"
              />
              <StoryBeatList :beats="sparks" :cluster-id="null" :empty-text="$t('story.sparks.empty')" @edit="editBeat" @toggle-tray="toggleTray" />
            </v-card-text>
          </v-card>
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
import StoryBeatRow from './StoryBeatRow.vue'
import StoryBeatDialog from './StoryBeatDialog.vue'
import StoryClusterDialog from './StoryClusterDialog.vue'
import StorylineManager from './StorylineManager.vue'
import {
  CLUSTER_HEATS, CLUSTER_STATUSES, COLOR_BY, clusterColor, heatColor, statusColor,
  type StoryBeat, type StoryCluster,
} from '~~/types/story'

/** The board: color-coded folding clusters, the next-session tray and the sparks shelf. */
defineEmits<{ 'open-run-sheet': [] }>()

const { t } = useI18n()
const store = useStoryBoardStore()

const onlyNear = ref(false)
const hidePlayed = ref(false)
const newSpark = ref('')

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

// --- party is at -------------------------------------------------------
function isNear(c: StoryCluster) {
  if (!store.settings.party_location_id) return false
  if (c.location_id && store.nearby.has(c.location_id)) return true
  return store.beatsOf(c.id).some(b => b.location_id && store.nearby.has(b.location_id))
}
// Always a fresh array, so the drag list redraws when a cluster changes (fold, rename, …)
const visibleClusters = computed(() => store.clusters.filter(c => !(onlyNear.value && store.settings.party_location_id) || isNear(c)))

// --- drag & drop -------------------------------------------------------
const clusterList = ref<StoryCluster[]>([])
watch(visibleClusters, v => (clusterList.value = [...v]), { immediate: true })
function saveClusterOrder() {
  const shown = clusterList.value.map(c => c.id)
  const hidden = store.clusters.filter(c => !shown.includes(c.id)).map(c => c.id)
  store.saveOrder({ clusters: [...shown, ...hidden] })
}

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
.cluster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  align-items: start;
}
.rail {
  position: sticky;
  top: 72px;
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
.tray-num {
  width: 18px;
  text-align: right;
  opacity: 0.6;
}
</style>
