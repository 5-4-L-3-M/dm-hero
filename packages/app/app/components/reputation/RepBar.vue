<template>
  <div class="rep-bar" :class="{ 'rep-bar--small': small }">
    <div class="d-flex align-center ga-2">
      <span class="rep-bar__tier" :style="{ color: `rgb(var(--v-theme-${themeColor}))` }">
        <v-icon size="x-small" class="mr-1">{{ icon }}</v-icon>{{ $t(`reputation.tiers.${tier.key}`) }}
      </span>
      <span v-if="label" class="text-body-small text-medium-emphasis text-truncate">{{ label }}</span>
    </div>
    <!-- Center line = neutral; red fills left, green fills right (notoriety fills from the left) -->
    <div class="rep-bar__track" :class="{ 'rep-bar__track--from-left': kind === 'notoriety' }">
      <div class="rep-bar__fill" :style="fillStyle" />
      <div v-if="kind !== 'notoriety'" class="rep-bar__mid" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { barRange, tierOf, type RepKind, type RepSubjectType } from '~~/types/reputation'

/** A reputation bar: the word on top, red-to-green fill below. Points stay hidden. */
const props = withDefaults(defineProps<{ points: number, type: RepSubjectType, kind?: RepKind, label?: string | null, small?: boolean }>(), { kind: 'rep', label: null, small: false })

const tier = computed(() => tierOf(props.points, props.type, props.kind))
const positive = computed(() => props.kind === 'notoriety' ? false : props.points > 0)
// Vuetify palette names → theme-ish colors that read on light and dark
const PALETTE: Record<string, string> = { 'red': 'error', 'orange': 'warning', 'grey': 'on-surface', 'light-green': 'success', 'green': 'success', 'teal': 'info', 'amber': 'warning', 'deep-orange': 'error' }
const themeColor = computed(() => PALETTE[tier.value.color] ?? 'on-surface')
const icon = computed(() => {
  if (props.kind === 'notoriety') return props.points > 0 ? 'mdi-shield-alert' : 'mdi-shield-outline'
  return props.points > 0 ? 'mdi-arrow-up-bold' : props.points < 0 ? 'mdi-arrow-down-bold' : 'mdi-minus'
})
const fillStyle = computed(() => {
  const range = barRange(props.type, props.kind)
  const share = Math.min(1, Math.abs(props.points) / range)
  if (props.kind === 'notoriety') return { left: '0', width: `${share * 100}%`, background: 'rgb(var(--v-theme-warning))' }
  const half = share * 50
  return positive.value
    ? { left: '50%', width: `${half}%`, background: 'rgb(var(--v-theme-success))' }
    : { left: `${50 - half}%`, width: `${half}%`, background: 'rgb(var(--v-theme-error))' }
})
</script>

<style scoped>
.rep-bar__tier {
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
}
.rep-bar--small .rep-bar__tier {
  font-size: 0.75rem;
}
.rep-bar__track {
  position: relative;
  height: 8px;
  margin-top: 3px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.1);
  overflow: hidden;
}
.rep-bar--small .rep-bar__track {
  height: 5px;
}
.rep-bar__fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  transition: all 0.3s;
}
.rep-bar__mid {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  background: rgba(var(--v-theme-on-surface), 0.35);
}
</style>
