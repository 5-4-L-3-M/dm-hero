<template>
  <div class="d-flex flex-column ga-3 h-100">
    <div v-if="next">
      <div class="text-body-small text-medium-emphasis">{{ $t('dashboardBoards.cards.nextSession.latest') }}</div>
      <div class="text-title-medium font-weight-bold">
        <span v-if="next.session_number">#{{ next.session_number }} · </span>{{ next.title }}
      </div>
      <div v-if="next.date" class="text-body-small text-medium-emphasis">{{ formatDate(next.date) }}</div>
    </div>
    <div class="d-flex ga-2 flex-wrap">
      <v-chip size="small" variant="tonal" color="primary" prepend-icon="mdi-tray-full">
        {{ $t('dashboardBoards.cards.nextSession.planned', { count: plan.tray.value.length }, plan.tray.value.length) }}
      </v-chip>
      <v-chip v-if="playedCount" size="small" variant="tonal" color="success" prepend-icon="mdi-check">
        {{ $t('dashboardBoards.cards.nextSession.played', { count: playedCount }) }}
      </v-chip>
    </div>
    <div v-if="plan.tray.value.length" class="d-flex flex-column ga-1">
      <div v-for="b in plan.tray.value" :key="b.id" class="d-flex align-center text-body-medium">
        <v-icon size="x-small" class="mr-2" :color="b.status === 'played' ? 'success' : undefined">{{ b.status === 'played' ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
        <span class="text-truncate" :class="{ 'text-medium-emphasis': b.status === 'played' }">{{ b.title }}</span>
      </div>
    </div>
    <div class="d-flex ga-2 flex-wrap mt-auto">
      <v-btn size="small" variant="flat" color="primary" prepend-icon="mdi-format-list-numbered" to="/story?tab=run">{{ $t('dashboardBoards.cards.nextSession.runSheet') }}</v-btn>
      <v-btn size="small" variant="tonal" prepend-icon="mdi-notebook" to="/sessions">{{ $t('dashboardBoards.cards.nextSession.sessions') }}</v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SessionRow } from '~/composables/useSessionPlan'

/** The newest session and what's lined up for it. */
const props = defineProps<{ sessions: SessionRow[] }>()
const plan = useSessionPlan()
const { locale } = useI18n()

const next = computed(() => [...props.sessions].sort((a, b) => (b.session_number ?? 0) - (a.session_number ?? 0) || b.id - a.id)[0] ?? null)
const playedCount = computed(() => plan.tray.value.filter(b => b.status === 'played').length)
function formatDate(d: string) {
  const date = new Date(d)
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString(locale.value, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
</script>
