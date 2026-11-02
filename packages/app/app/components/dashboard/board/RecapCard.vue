<template>
  <div v-if="last">
    <div class="text-title-small font-weight-bold mb-1">
      <span v-if="last.session_number">#{{ last.session_number }} · </span>{{ last.title }}
    </div>
    <div class="recap text-body-medium">{{ summaryText(last.summary) }}</div>
  </div>
  <div v-else class="text-body-medium text-medium-emphasis">{{ $t('dashboardBoards.cards.recap.empty') }}</div>
</template>

<script setup lang="ts">
import type { SessionRow } from '~/composables/useSessionPlan'

/** "Last time on…": the newest session that has a summary. */
const props = defineProps<{ sessions: SessionRow[] }>()
const last = computed(() => [...props.sessions]
  .filter(s => summaryText(s.summary))
  .sort((a, b) => (b.session_number ?? 0) - (a.session_number ?? 0) || b.id - a.id)[0] ?? null)
</script>

<style scoped>
.recap {
  white-space: pre-line;
}
</style>
