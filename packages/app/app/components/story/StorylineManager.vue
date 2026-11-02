<template>
  <v-dialog :model-value="modelValue" max-width="600" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>{{ $t('story.storyline.manage') }}</v-card-title>
      <v-card-subtitle class="text-wrap">{{ $t('story.storyline.manageHint') }}</v-card-subtitle>
      <v-card-text>
        <div v-for="line in store.storylines" :key="line.id" class="d-flex align-center ga-2 mb-2">
          <v-menu :close-on-content-click="false">
            <template #activator="{ props: menu }">
              <button v-bind="menu" class="swatch" :style="{ background: colorCss(storylineColor(line)) }" :aria-label="$t('story.storyline.color')" />
            </template>
            <v-card class="pa-3" width="280">
              <div class="d-flex flex-wrap ga-2">
                <button
                  v-for="p in presets"
                  :key="p.key"
                  class="swatch"
                  :class="{ 'swatch--active': isCurrent(line, p) }"
                  :style="{ background: colorCss(p.color) }"
                  :aria-label="$t('story.storyline.color')"
                  @click="pick(line.id, p)"
                />
              </div>
              <v-divider class="my-3" />
              <div class="text-body-small text-medium-emphasis mb-1">{{ $t('story.storyline.ownColor') }}</div>
              <v-color-picker
                :model-value="line.custom_color ?? '#8a5cf6'"
                mode="hex"
                :modes="['hex']"
                hide-inputs
                elevation="0"
                width="256"
                @update:model-value="draftColor[line.id] = $event"
              />
              <div class="d-flex ga-2 mt-2">
                <v-btn size="small" color="primary" variant="flat" :disabled="!draftColor[line.id]" @click="useOwn(line.id)">{{ $t('story.storyline.useColor') }}</v-btn>
                <v-btn size="small" variant="tonal" :disabled="!draftColor[line.id]" @click="saveAsPreset(line.id)">{{ $t('story.storyline.savePreset') }}</v-btn>
              </div>
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

        <!-- The color presets: hide theme ones, add and remove your own -->
        <v-divider class="my-4" />
        <div class="d-flex align-center mb-2">
          <span class="text-body-medium font-weight-bold">{{ $t('story.storyline.presets') }}</span>
          <v-spacer />
          <v-menu :close-on-content-click="false">
            <template #activator="{ props: menu }">
              <v-btn v-bind="menu" size="small" variant="tonal" prepend-icon="mdi-plus">{{ $t('story.storyline.addPreset') }}</v-btn>
            </template>
            <v-card class="pa-3" width="280">
              <v-color-picker v-model="newPreset" mode="hex" :modes="['hex']" elevation="0" width="256" />
              <v-btn class="mt-2" size="small" color="primary" variant="flat" block @click="addPreset">{{ $t('common.add') }}</v-btn>
            </v-card>
          </v-menu>
        </div>
        <div class="d-flex flex-wrap ga-2">
          <div v-for="p in allPresets" :key="p.key" class="preset" :class="{ 'preset--hidden': p.hidden }">
            <span class="swatch swatch--static" :style="{ background: colorCss(p.color) }" />
            <button class="preset__x" :title="p.theme ? (p.hidden ? $t('story.storyline.showPreset') : $t('story.storyline.hidePreset')) : $t('common.delete')" @click="removePreset(p)">
              <v-icon size="12">{{ p.theme && p.hidden ? 'mdi-eye' : 'mdi-close' }}</v-icon>
            </button>
          </div>
        </div>
        <div class="text-body-small text-medium-emphasis mt-2">{{ $t('story.storyline.presetsHint') }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { STORY_COLOR_COUNT, colorCss, storylineColor, type StoryLine } from '~~/types/story'

/** Storylines and their colors: theme presets, your own presets, or any color. Deleting one keeps its clusters. */
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()

const store = useStoryBoardStore()
const newName = ref('')
const draftColor = ref<Record<number, string>>({})
const newPreset = ref('#8a5cf6')

interface Preset { key: string, color: string, theme: number | null, hidden: boolean }
const palette = computed(() => store.settings.palette ?? { custom: [], hidden: [] })
const allPresets = computed<Preset[]>(() => [
  ...Array.from({ length: STORY_COLOR_COUNT }, (_, i) => ({ key: `t${i + 1}`, color: `story-${i + 1}`, theme: i + 1, hidden: palette.value.hidden.includes(i + 1) })),
  ...palette.value.custom.map(c => ({ key: c, color: c, theme: null, hidden: false })),
])
const presets = computed(() => allPresets.value.filter(p => !p.hidden))

function isCurrent(line: StoryLine, p: Preset) {
  return p.theme ? !line.custom_color && line.color === p.theme : line.custom_color === p.color
}
function pick(id: number, p: Preset) {
  if (p.theme) store.updateStoryline(id, { color: p.theme })
  else store.updateStoryline(id, { custom_color: p.color })
}
const hex = (v: string) => v.slice(0, 7).toLowerCase()
function useOwn(id: number) {
  const c = draftColor.value[id]
  if (c) store.updateStoryline(id, { custom_color: hex(c) })
}
async function saveAsPreset(id: number) {
  const c = draftColor.value[id]
  if (!c) return
  await savePalette({ ...palette.value, custom: [...palette.value.custom, hex(c)] })
  store.updateStoryline(id, { custom_color: hex(c) })
}
function addPreset() {
  savePalette({ ...palette.value, custom: [...palette.value.custom, hex(newPreset.value)] })
}
function removePreset(p: Preset) {
  if (p.theme) {
    const hidden = p.hidden ? palette.value.hidden.filter(x => x !== p.theme) : [...palette.value.hidden, p.theme]
    savePalette({ ...palette.value, hidden })
  }
  else savePalette({ ...palette.value, custom: palette.value.custom.filter(c => c !== p.color) })
}
function savePalette(next: { custom: string[], hidden: number[] }) {
  return store.saveSettings({ palette: next })
}

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
  display: inline-block;
}
.swatch--static {
  cursor: default;
}
.swatch--active {
  border-color: rgb(var(--v-theme-on-surface));
}
.preset {
  position: relative;
}
.preset--hidden {
  opacity: 0.3;
}
.preset__x {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 0;
  display: grid;
  place-items: center;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface-variant));
  cursor: pointer;
}
</style>
