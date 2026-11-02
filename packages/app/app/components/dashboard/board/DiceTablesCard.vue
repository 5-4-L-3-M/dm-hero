<template>
  <div class="d-flex flex-column ga-2">
    <v-autocomplete
      v-model="pickedId"
      :items="all"
      item-title="name"
      item-value="id"
      :placeholder="$t('dashboardBoards.cards.rollTables.pick')"
      prepend-inner-icon="mdi-dice-multiple"
      variant="outlined"
      density="compact"
      hide-details
      clearable
    />
    <RollTablesCard v-for="tb in shown" :key="tb.id" :table="tb" compact />
    <div v-if="!shown.length" class="text-body-small text-medium-emphasis">{{ $t('dashboardBoards.cards.rollTables.hint') }}</div>
  </div>
</template>

<script setup lang="ts">
import type { SessionRow } from '~/composables/useSessionPlan'
import type { RollTable } from '~~/types/rollTable'

/** Roll tables for the next session (tagged to it), plus any other one picked here. */
const props = defineProps<{ campaignId: number, sessions: SessionRow[] }>()
const all = ref<RollTable[]>([])
const pickedId = ref<number | null>(null)
const next = computed(() => [...props.sessions].sort((a, b) => (b.session_number ?? 0) - (a.session_number ?? 0) || b.id - a.id)[0] ?? null)
async function load() {
  all.value = await $fetch<RollTable[]>('/api/roll-tables', { query: { campaignId: props.campaignId } }).catch(() => [])
}
watch(() => props.campaignId, load, { immediate: true })
const shown = computed(() => {
  const tagged = next.value ? all.value.filter(tb => tb.tags.some(t => t.kind === 'session' && t.ref_id === next.value!.id)) : []
  const picked = all.value.find(tb => tb.id === pickedId.value)
  return picked && !tagged.includes(picked) ? [picked, ...tagged] : tagged
})
</script>
