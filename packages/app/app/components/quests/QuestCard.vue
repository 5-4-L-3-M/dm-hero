<template>
  <v-card
    class="quest-card"
    :class="{ 'quest-card--highlight': highlight }"
    :style="{ '--quest-color': `rgb(var(--v-theme-${color}))` }"
    variant="outlined"
    @click="$emit('open', quest)"
  >
    <div class="pa-3">
      <div class="d-flex align-start ga-1">
        <v-icon class="quest-handle text-medium-emphasis mt-1" size="small" @click.stop>mdi-drag-vertical</v-icon>
        <span class="text-body-large font-weight-bold flex-grow-1">{{ quest.name }}</span>
        <v-btn icon="mdi-pencil" variant="text" size="x-small" :aria-label="$t('common.edit')" @click.stop="$emit('edit', quest)" />
      </div>

      <div class="d-flex flex-wrap ga-1 mt-1">
        <v-chip v-if="storyline" size="x-small" :color="`story-${storyline.color}`" variant="flat">{{ storyline.name }}</v-chip>
        <v-chip v-if="quest.giver_name" size="x-small" variant="tonal" @click.stop>
          <v-icon start size="x-small">mdi-account-voice</v-icon>
          <SharedEntityLink :id="quest.giver_id" :type="giverType" :name="quest.giver_name" />
        </v-chip>
        <v-chip v-if="quest.location_name" size="x-small" variant="tonal" color="green" @click.stop>
          <v-icon start size="x-small">mdi-map-marker</v-icon>
          <SharedEntityLink :id="quest.location_id" type="Location" :name="quest.location_name" />
        </v-chip>
      </div>

      <div v-if="quest.objectives.length" class="mt-2">
        <v-progress-linear :model-value="(done / quest.objectives.length) * 100" :color="color" height="6" rounded />
        <div class="text-body-small text-medium-emphasis mt-1">{{ $t('quests.objectivesDone', { done, total: quest.objectives.length }) }}</div>
      </div>
      <div v-if="quest.reward" class="text-body-small mt-1">
        <v-icon size="x-small" class="mr-1">mdi-treasure-chest</v-icon>{{ quest.reward }}
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { NO_COLOR, type Quest } from '~~/types/story'

/** A quest on the quest board. Click → side panel; pencil → edit. */
const props = defineProps<{ quest: Quest, highlight?: boolean }>()
defineEmits<{ open: [quest: Quest], edit: [quest: Quest] }>()

const store = useStoryBoardStore()
const storyline = computed(() => store.storylines.find(s => s.id === props.quest.storyline_id) ?? null)
const color = computed(() => (storyline.value ? `story-${storyline.value.color}` : NO_COLOR))
const done = computed(() => props.quest.objectives.filter(o => o.done).length)
const giverType = computed(() => props.quest.giver_type ?? 'NPC')
</script>

<style scoped>
.quest-card {
  border-left: 5px solid var(--quest-color) !important;
}
.quest-card--highlight {
  box-shadow: 0 0 0 2px rgb(var(--v-theme-primary));
}
.quest-handle {
  cursor: grab;
}
</style>
