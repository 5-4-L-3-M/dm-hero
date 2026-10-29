<template>
  <div class="carry-load">
    <div class="carry-load__track" :class="{ 'carry-load__track--compact': compact }">
      <v-progress-linear
        :model-value="percent"
        :color="statusColor(status)"
        :height="compact ? 8 : 14"
        bg-opacity="0.18"
        rounded
      />
      <!-- Encumbrance thresholds (STR×5, STR×10) placed against the real capacity,
           which includes the player's carry bonus -->
      <span v-for="(left, i) in ticks" :key="i" class="carry-load__tick" :style="{ left: `${left}%` }" />
    </div>
    <div v-if="!compact && thresholds" class="d-flex justify-space-between text-body-small text-medium-emphasis mt-1">
      <span>0</span>
      <span>{{ $t('inventory.encumberedAt', { weight: formatWeight(thresholds.encumbered) }) }}</span>
      <span>{{ $t('inventory.heavyAt', { weight: formatWeight(thresholds.heavy) }) }}</span>
      <span>{{ $t('inventory.maxAt', { weight: formatWeight(thresholds.capacity) }) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CarryThresholds, LoadStatus } from '~~/types/inventory'

const props = defineProps<{
  carried: number
  thresholds: CarryThresholds | null
  status: LoadStatus
  compact?: boolean
}>()

const { formatWeight } = useUnits()

const percent = computed(() => {
  if (!props.thresholds || props.thresholds.capacity <= 0) return 0
  return Math.min(100, (props.carried / props.thresholds.capacity) * 100)
})

/** Tick positions (%) for the encumbered and heavy lines; hidden past the end of the bar. */
const ticks = computed(() => {
  const t = props.thresholds
  if (!t || t.capacity <= 0) return []
  return [t.encumbered, t.heavy]
    .map(w => (w / t.capacity) * 100)
    .filter(p => p > 0 && p < 100)
})

const statusColor = loadStatusColor
</script>

<style scoped>
.carry-load__track {
  position: relative;
}
.carry-load__tick {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  margin-left: -1px;
  background: rgb(var(--v-theme-on-surface));
  opacity: 0.45;
  border-radius: 1px;
  pointer-events: none;
}
.carry-load__track--compact .carry-load__tick {
  top: -2px;
  bottom: -2px;
}
</style>
