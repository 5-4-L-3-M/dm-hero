<template>
  <!-- game-icons.net (CC BY 3.0) — the SVG paths are from our own bundled icon set -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <svg v-if="svg" class="game-icon" :width="size" :height="size" viewBox="0 0 512 512" aria-hidden="true" v-html="svg" />
  <span v-else class="game-icon game-icon--empty" :style="{ width: `${size}px`, height: `${size}px` }" />
</template>

<script setup lang="ts">
/** One icon from the bundled game-icons.net set, drawn in the current text color. */
const props = withDefaults(defineProps<{ name: string | null | undefined, size?: number }>(), { size: 24 })
const { body } = useGameIcons()
const svg = computed(() => body(props.name))
</script>

<style scoped>
.game-icon {
  display: inline-block;
  flex-shrink: 0;
  fill: currentColor;
}
.game-icon :deep(path) {
  fill: currentColor;
}
</style>
