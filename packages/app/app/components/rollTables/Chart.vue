<template>
  <div class="chart-wrap">
    <table class="chart">
      <thead>
        <tr>
          <th class="chart__roll">{{ dice }}</th>
          <th v-for="(h, i) in headings" :key="i">{{ h }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in rows" :key="i" :class="{ chart__hit: hit === r }">
          <td class="chart__roll">{{ r.min === r.max ? r.min : `${r.min}–${r.max}` }}</td>
          <td v-for="(c, j) in padded(r)" :key="j" class="chart__cell">{{ c }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { cellsOf, type RollTableRow } from '~~/types/rollTable'

/** A roll table drawn as a chart: the roll column, then one column per "|" part of the results. */
const props = defineProps<{ rows: RollTableRow[], dice: string, columns?: string[], hit?: RollTableRow | null }>()
const { t } = useI18n()

const width = computed(() => Math.max(1, props.columns?.length ?? 0, ...props.rows.map(r => cellsOf(r.result).length)))
const headings = computed(() => Array.from({ length: width.value }, (_, i) => props.columns?.[i] ?? (i === 0 ? t('rollTables.result') : '')))
function padded(r: RollTableRow) {
  const cells = cellsOf(r.result)
  // Extra parts beyond the headings join the last column
  if (cells.length > width.value) return [...cells.slice(0, width.value - 1), cells.slice(width.value - 1).join(' | ')]
  return [...cells, ...Array.from({ length: width.value - cells.length }, () => '')]
}
</script>

<style scoped>
.chart-wrap {
  overflow-x: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
.chart {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.chart th {
  text-align: left;
  font-weight: 700;
  padding: 6px 10px;
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.5);
  white-space: nowrap;
}
.chart td {
  padding: 5px 10px;
  vertical-align: top;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: pre-line;
}
.chart td + td,
.chart th + th {
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.chart tbody tr:nth-child(even) td {
  background: rgba(var(--v-theme-on-surface), 0.035);
}
.chart__roll {
  width: 1%;
  white-space: nowrap;
  text-align: center !important;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
.chart tbody tr.chart__hit td {
  background: rgba(var(--v-theme-primary), 0.24);
}
.chart tbody tr.chart__hit td:first-child {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-primary));
}
</style>
