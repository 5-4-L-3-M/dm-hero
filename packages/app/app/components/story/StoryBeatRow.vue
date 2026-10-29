<template>
  <div
    class="beat-row d-flex align-start pa-2 rounded"
    :class="{ 'beat-row--done': beat.status === 'played' || beat.status === 'cut', 'beat-row--cut': beat.status === 'cut' }"
    role="button"
    tabindex="0"
    @click="$emit('edit', beat)"
    @keydown.enter="$emit('edit', beat)"
  >
    <v-icon class="beat-handle mr-1 mt-1 text-medium-emphasis" size="small" @click.stop>mdi-drag-vertical</v-icon>
    <v-icon class="mr-2 mt-1" size="small" :color="statusColor">{{ BEAT_KIND_ICONS[beat.kind] }}</v-icon>

    <div class="flex-grow-1 min-w-0">
      <div class="d-flex align-center ga-1">
        <span class="beat-title text-body-medium font-weight-medium">{{ beat.title }}</span>
        <v-icon v-if="beat.status === 'played'" size="x-small" color="success" :title="$t('story.beatStatus.played')">mdi-check-circle</v-icon>
        <v-icon v-else-if="beat.status === 'ready'" size="x-small" color="primary" :title="$t('story.beatStatus.ready')">mdi-circle</v-icon>
      </div>
      <div v-if="beat.location_name || beat.entities.length" class="d-flex flex-wrap ga-1 mt-1">
        <v-chip v-if="beat.location_name" size="x-small" variant="tonal" color="green" @click.stop>
          <v-icon start size="x-small">mdi-map-marker</v-icon>
          <SharedEntityLink :id="beat.location_id" type="Location" :name="beat.location_name" />
        </v-chip>
        <v-chip v-for="e in beat.entities.slice(0, maxChips)" :key="e.id" size="x-small" variant="tonal" @click.stop>
          <v-icon start size="x-small">{{ entityIcon(e.type) }}</v-icon>
          <SharedEntityLink :id="e.id" :type="e.type" :name="e.name" />
        </v-chip>
        <v-chip v-if="beat.entities.length > maxChips" size="x-small" variant="text">+{{ beat.entities.length - maxChips }}</v-chip>
      </div>
    </div>

    <v-btn
      :icon="beat.tray_order !== null ? 'mdi-calendar-check' : 'mdi-calendar-plus'"
      :color="beat.tray_order !== null ? 'primary' : undefined"
      :title="beat.tray_order !== null ? $t('story.tray.remove') : $t('story.tray.add')"
      :aria-label="beat.tray_order !== null ? $t('story.tray.remove') : $t('story.tray.add')"
      variant="text"
      size="x-small"
      @click.stop="$emit('toggle-tray', beat)"
    />
  </div>
</template>

<script setup lang="ts">
import { BEAT_KIND_ICONS, type StoryBeat } from '~~/types/story'
import { ENTITY_PREVIEW_CONFIG } from '~/utils/entityPreview'
import { toPreviewType } from '~/stores/entityTabs'

/** One beat on the board: kind, title, linked entries (click → side panel), tray toggle. */
const props = withDefaults(defineProps<{ beat: StoryBeat, maxChips?: number }>(), { maxChips: 3 })
defineEmits<{ 'edit': [beat: StoryBeat], 'toggle-tray': [beat: StoryBeat] }>()

const statusColor = computed(() => ({ idea: undefined, ready: 'primary', played: 'success', cut: undefined })[props.beat.status])

function entityIcon(type: string) {
  const t = toPreviewType(type)
  return t ? ENTITY_PREVIEW_CONFIG[t].icon : 'mdi-link'
}
</script>

<style scoped>
.beat-row {
  cursor: pointer;
  transition: background-color 0.15s;
}
.beat-row:hover,
.beat-row:focus-visible {
  background: rgba(var(--v-theme-on-surface), 0.06);
  outline: none;
}
.beat-row--done {
  opacity: 0.55;
}
.beat-row--cut .beat-title {
  text-decoration: line-through;
}
.beat-handle {
  cursor: grab;
}
.min-w-0 {
  min-width: 0;
}
</style>
