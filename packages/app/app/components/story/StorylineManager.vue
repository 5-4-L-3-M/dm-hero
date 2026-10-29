<template>
  <v-dialog :model-value="modelValue" max-width="560" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>{{ $t('story.storyline.manage') }}</v-card-title>
      <v-card-subtitle class="text-wrap">{{ $t('story.storyline.manageHint') }}</v-card-subtitle>
      <v-card-text>
        <div v-for="line in store.storylines" :key="line.id" class="d-flex align-center ga-2 mb-2">
          <v-menu>
            <template #activator="{ props: menu }">
              <button v-bind="menu" class="swatch" :style="{ background: `rgb(var(--v-theme-story-${line.color}))` }" :aria-label="$t('story.storyline.color')" />
            </template>
            <v-card class="pa-2 d-flex ga-2">
              <button
                v-for="c in STORY_COLOR_COUNT"
                :key="c"
                class="swatch"
                :class="{ 'swatch--active': c === line.color }"
                :style="{ background: `rgb(var(--v-theme-story-${c}))` }"
                :aria-label="`${$t('story.storyline.color')} ${c}`"
                @click="store.updateStoryline(line.id, { color: c })"
              />
            </v-card>
          </v-menu>
          <v-text-field
            :model-value="line.name"
            variant="outlined"
            density="compact"
            hide-details
            @change="(e: Event) => store.updateStoryline(line.id, { name: (e.target as HTMLInputElement).value })"
          />
          <v-btn icon="mdi-delete" variant="text" size="small" color="error" :aria-label="$t('common.delete')" @click="store.deleteStoryline(line.id)" />
        </div>
        <div v-if="store.storylines.length === 0" class="text-medium-emphasis text-body-medium mb-3">{{ $t('story.storyline.none') }}</div>

        <div class="d-flex ga-2 mt-4">
          <v-text-field
            v-model="newName"
            :placeholder="$t('story.storyline.newPlaceholder')"
            variant="outlined"
            density="compact"
            hide-details
            @keyup.enter="add"
          />
          <v-btn color="primary" variant="flat" :disabled="!newName.trim()" @click="add">{{ $t('common.add') }}</v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { STORY_COLOR_COUNT } from '~~/types/story'

/** Storylines and their colors (6 per theme). Deleting one keeps its clusters. */
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()

const store = useStoryBoardStore()
const newName = ref('')

async function add() {
  const name = newName.value.trim()
  if (!name) return
  newName.value = ''
  await store.addStoryline(name)
}
</script>

<style scoped>
.swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid rgba(var(--v-theme-on-surface), 0.15);
  cursor: pointer;
}
.swatch--active {
  border-color: rgb(var(--v-theme-on-surface));
}
</style>
