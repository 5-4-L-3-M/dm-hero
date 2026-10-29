<template>
  <section class="preview-section">
    <button type="button" class="preview-section__head" :aria-expanded="open" @click="toggle">
      <v-icon size="small" class="mr-2" :color="color">{{ icon }}</v-icon>
      <span class="text-title-small font-weight-bold">{{ title }}</span>
      <v-chip v-if="count !== undefined" size="x-small" class="ml-2">{{ count }}</v-chip>
      <v-spacer />
      <v-icon size="small" class="text-medium-emphasis">{{ open ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
    </button>
    <v-expand-transition>
      <div v-show="open" class="pt-1 pb-2">
        <slot />
      </div>
    </v-expand-transition>
  </section>
</template>

<script setup lang="ts">
/**
 * A foldable section of the side panel / full view (Items, NPCs, Documents …).
 * Whether a section is folded is remembered per section name in this browser.
 */
const props = defineProps<{ id: string, title: string, icon: string, count?: number, color?: string }>()

const STORAGE_KEY = 'dmhero.previewSections.folded'
function readFolded(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  }
  catch {
    return []
  }
}
const open = ref(true)
onMounted(() => {
  open.value = !readFolded().includes(props.id)
})
function toggle() {
  open.value = !open.value
  try {
    const folded = new Set(readFolded())
    if (open.value) folded.delete(props.id)
    else folded.add(props.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...folded]))
  }
  catch {
    // storage blocked — folding still works for this view
  }
}
</script>

<style scoped>
.preview-section {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding-top: 8px;
  margin-top: 8px;
}
.preview-section__head {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 4px 0;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
  text-align: left;
}
.preview-section__head:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  border-radius: 4px;
}
</style>
