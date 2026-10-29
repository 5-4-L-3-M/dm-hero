<template>
  <svg :width="diameter" :height="diameter" viewBox="-1 -1 2 2" class="clock" role="group" :aria-label="`${filled} / ${size}`">
    <path
      v-for="i in size"
      :key="i"
      :d="wedge(i - 1)"
      class="clock__seg"
      :class="{ 'clock__seg--on': i <= filled, 'clock__seg--readonly': readonly }"
      :style="i <= filled ? { fill: `rgb(var(--v-theme-${color}))` } : undefined"
      @click="!readonly && $emit('update:filled', i === filled ? i - 1 : i)"
    >
      <title>{{ i }} / {{ size }}</title>
    </path>
  </svg>
</template>

<script setup lang="ts">
/** A progress clock: click a segment to fill up to it (click the last filled one to step back). */
const props = withDefaults(defineProps<{ size: number, filled: number, color?: string, diameter?: number, readonly?: boolean }>(), {
  color: 'primary',
  diameter: 56,
  readonly: false,
})
defineEmits<{ 'update:filled': [value: number] }>()

function point(angle: number) {
  return `${(Math.sin(angle) * 0.92).toFixed(4)} ${(-Math.cos(angle) * 0.92).toFixed(4)}`
}
function wedge(i: number) {
  const a0 = (i / props.size) * Math.PI * 2
  const a1 = ((i + 1) / props.size) * Math.PI * 2
  return `M 0 0 L ${point(a0)} A 0.92 0.92 0 0 1 ${point(a1)} Z`
}
</script>

<style scoped>
.clock__seg {
  fill: rgba(var(--v-theme-on-surface), 0.08);
  stroke: rgb(var(--v-theme-surface));
  stroke-width: 0.06;
  cursor: pointer;
  transition: fill 0.15s;
}
.clock__seg:not(.clock__seg--on):not(.clock__seg--readonly):hover {
  fill: rgba(var(--v-theme-on-surface), 0.2);
}
.clock__seg--readonly {
  cursor: default;
}
</style>
