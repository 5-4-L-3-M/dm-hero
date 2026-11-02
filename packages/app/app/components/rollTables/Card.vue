<template>
  <v-card variant="outlined" class="roll-card" :class="{ 'roll-card--compact': compact }">
    <div class="d-flex align-center pa-3 pb-2 ga-2">
      <v-icon color="primary" size="small">mdi-dice-multiple</v-icon>
      <div class="flex-grow-1 min-w-0">
        <div class="font-weight-bold text-wrap">{{ table.name }}</div>
        <div v-if="table.category && !compact" class="text-body-small text-medium-emphasis">{{ table.category }}</div>
      </div>
      <v-chip size="x-small" variant="tonal">{{ dice }}</v-chip>
      <v-btn color="primary" variant="flat" size="small" prepend-icon="mdi-dice-d20" :disabled="!table.rows.length" @click="roll">{{ $t('rollTables.roll') }}</v-btn>
      <v-menu v-if="!compact">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon="mdi-dots-vertical" size="x-small" variant="text" />
        </template>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-pencil" :title="$t('common.edit')" @click="$emit('edit', table)" />
          <v-list-item prepend-icon="mdi-delete" :title="$t('common.delete')" @click="$emit('delete', table)" />
        </v-list>
      </v-menu>
    </div>

    <!-- The last roll, big -->
    <div v-if="last" class="result mx-3 mb-2 pa-2 rounded">
      <div class="text-body-small text-medium-emphasis">{{ $t('rollTables.rolled', { n: last.total }) }}<template v-if="last.rolls.length > 1"> ({{ last.rolls.join(' + ') }})</template></div>
      <div class="text-body-large font-weight-medium result-text">{{ last.row ? cellsOf(last.row.result).filter(Boolean).join(' · ') : $t('rollTables.noRow') }}</div>
    </div>

    <div v-if="table.description && !compact" class="text-body-small text-medium-emphasis px-3 pb-2 text-pre">{{ table.description }}</div>

    <!-- Rows (folded in compact mode) -->
    <div v-if="!compact || showRows" class="px-3 pb-2">
      <RollTablesChart v-if="table.rows.length" :rows="table.rows" :dice="dice" :columns="table.columns" :hit="last?.row ?? null" />
      <div v-if="!table.rows.length" class="text-body-small text-medium-emphasis">{{ $t('rollTables.noRows') }}</div>
    </div>
    <div class="d-flex flex-wrap align-center ga-1 px-3 pb-3">
      <v-btn v-if="compact" size="x-small" variant="text" :prepend-icon="showRows ? 'mdi-chevron-up' : 'mdi-chevron-down'" @click="showRows = !showRows">
        {{ $t('rollTables.rows', { n: table.rows.length }) }}
      </v-btn>
      <template v-if="!compact">
        <v-chip v-for="t in table.tags" :key="`${t.kind}${t.ref_id}`" size="x-small" variant="tonal" :prepend-icon="t.kind === 'session' ? 'mdi-calendar-star' : 'mdi-tag'">
          <SharedEntityLink v-if="t.kind === 'entity'" :id="t.ref_id" :type="t.type" :name="t.name" />
          <template v-else>{{ t.name }}</template>
        </v-chip>
      </template>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { cellsOf, rollDice, rowFor, tableDice, type RollTable, type RollTableRow } from '~~/types/rollTable'

/** One roll table: roll it, see the hit row light up. */
const props = defineProps<{ table: RollTable, compact?: boolean }>()
defineEmits<{ edit: [table: RollTable], delete: [table: RollTable] }>()

const dice = computed(() => tableDice(props.table))
const last = ref<{ total: number, rolls: number[], row: RollTableRow | null } | null>(null)
const showRows = ref(false)
function roll() {
  const r = rollDice(dice.value)
  last.value = { ...r, row: rowFor(props.table.rows, r.total) }
}
</script>

<style scoped>
.result {
  background: rgba(var(--v-theme-primary), 0.12);
  border-left: 3px solid rgb(var(--v-theme-primary));
}
.result-text,
.text-pre {
  white-space: pre-line;
}
.min-w-0 {
  min-width: 0;
}
</style>
