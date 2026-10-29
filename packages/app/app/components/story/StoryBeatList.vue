<template>
  <draggable
    v-model="items"
    item-key="id"
    group="story-beats"
    handle=".beat-handle"
    :animation="180"
    ghost-class="beat-ghost"
    class="beat-list"
    :class="{ 'beat-list--empty': items.length === 0 }"
    :data-empty-text="emptyText"
    @start="dragging = true"
    @end="dragging = false"
    @change="onChange"
  >
    <template #item="{ element }">
      <StoryBeatRow :beat="element" @edit="$emit('edit', $event)" @toggle-tray="$emit('toggle-tray', $event)" />
    </template>
  </draggable>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import StoryBeatRow from './StoryBeatRow.vue'
import type { StoryBeat } from '~~/types/story'

/**
 * A droppable list of beats — one per cluster, plus the sparks shelf
 * (clusterId null). Dragging between lists moves the beat there.
 */
const props = defineProps<{ beats: StoryBeat[], clusterId: number | null, emptyText?: string }>()
defineEmits<{ 'edit': [beat: StoryBeat], 'toggle-tray': [beat: StoryBeat] }>()

const store = useStoryBoardStore()
const items = ref<StoryBeat[]>([...props.beats])
const dragging = ref(false)

watch(() => props.beats, (beats) => {
  if (!dragging.value) items.value = [...beats]
})

function onChange(e: { added?: unknown, moved?: unknown }) {
  if (!e.added && !e.moved) return
  store.saveOrder({ lists: [{ clusterId: props.clusterId, beatIds: items.value.map(b => b.id) }] })
}
</script>

<style scoped>
.beat-list {
  min-height: 40px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.beat-list--empty {
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  align-items: center;
  justify-content: center;
}
.beat-list--empty::after {
  content: attr(data-empty-text);
  font-size: 0.8rem;
  opacity: 0.6;
  padding: 8px;
}
.beat-ghost {
  opacity: 0.4;
  background: rgba(var(--v-theme-primary), 0.12);
}
</style>
