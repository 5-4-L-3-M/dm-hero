<template>
  <v-card
    class="cluster-card"
    :class="{ 'cluster-card--near': near, 'cluster-card--faded': faded }"
    :style="{ '--cluster-color': `rgb(var(--v-theme-${color}))` }"
    variant="flat"
    border
  >
    <div class="cluster-card__bar" />
    <div class="d-flex align-center px-2 pt-2">
      <v-icon class="cluster-handle mr-1 text-medium-emphasis" size="small">mdi-drag</v-icon>
      <v-btn
        :icon="cluster.collapsed ? 'mdi-chevron-right' : 'mdi-chevron-down'"
        :aria-label="cluster.collapsed ? $t('story.cluster.expand') : $t('story.cluster.collapse')"
        variant="text"
        size="x-small"
        @click="store.updateCluster(cluster.id, { collapsed: !cluster.collapsed })"
      />
      <span class="text-title-small font-weight-bold flex-grow-1 cluster-title" role="button" tabindex="0" @click="$emit('edit', cluster)" @keydown.enter="$emit('edit', cluster)">
        {{ cluster.title }}
      </span>
      <v-chip size="x-small" variant="tonal" class="mr-1" :title="$t('story.cluster.progress')">
        {{ playedCount }}/{{ beats.length }}
      </v-chip>
      <v-menu>
        <template #activator="{ props: menu }">
          <v-btn v-bind="menu" icon="mdi-dots-vertical" variant="text" size="x-small" :aria-label="$t('common.actions')" />
        </template>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-pencil" :title="$t('common.edit')" @click="$emit('edit', cluster)" />
          <v-list-item prepend-icon="mdi-delete" base-color="error" :title="$t('common.delete')" @click="$emit('delete', cluster)" />
        </v-list>
      </v-menu>
    </div>

    <!-- What this cluster is: storyline, heat, status, place, quest -->
    <div class="d-flex flex-wrap ga-1 px-3 pb-2">
      <v-chip v-if="storyline" size="x-small" :color="`story-${storyline.color}`" variant="flat">{{ storyline.name }}</v-chip>
      <v-chip size="x-small" :color="heatColor(cluster.heat)" variant="tonal">
        <v-icon start size="x-small">{{ HEAT_ICONS[cluster.heat] }}</v-icon>{{ $t(`story.heat.${cluster.heat}`) }}
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

    <v-expand-transition>
      <div v-show="!cluster.collapsed" class="px-2 pb-2">
        <div v-if="cluster.notes" class="text-body-small text-medium-emphasis px-2 pb-2 cluster-notes">{{ cluster.notes }}</div>
        <StoryBeatList
          :beats="visibleBeats"
          :cluster-id="cluster.id"
          :empty-text="$t('story.cluster.dropHere')"
          @edit="$emit('edit-beat', $event)"
          @toggle-tray="$emit('toggle-tray', $event)"
        />
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
import { heatColor, type ClusterHeat, type StoryBeat, type StoryCluster } from '~~/types/story'

/** A folding cluster of beats, color-coded by the board's color-by parameter. */
const props = defineProps<{ cluster: StoryCluster, color: string, near: boolean, faded: boolean, hidePlayed: boolean }>()
defineEmits<{
  'edit': [cluster: StoryCluster]
  'delete': [cluster: StoryCluster]
  'edit-beat': [beat: StoryBeat]
  'toggle-tray': [beat: StoryBeat]
}>()

const HEAT_ICONS: Record<ClusterHeat, string> = { cold: 'mdi-snowflake', warm: 'mdi-weather-sunny', hot: 'mdi-fire' }

const store = useStoryBoardStore()
const storyline = computed(() => store.storylines.find(s => s.id === props.cluster.storyline_id) ?? null)
const beats = computed(() => store.beatsOf(props.cluster.id))
const visibleBeats = computed(() => (props.hidePlayed ? beats.value.filter(b => b.status !== 'played' && b.status !== 'cut') : beats.value))
const playedCount = computed(() => beats.value.filter(b => b.status === 'played').length)

const newBeat = ref('')
async function addBeat() {
  const title = newBeat.value.trim()
  if (!title) return
  newBeat.value = ''
  await store.addBeat({ title, cluster_id: props.cluster.id })
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
.cluster-card--faded {
  opacity: 0.45;
}
.cluster-handle {
  cursor: grab;
}
.cluster-title {
  cursor: pointer;
}
.cluster-notes {
  white-space: pre-line;
}
</style>
