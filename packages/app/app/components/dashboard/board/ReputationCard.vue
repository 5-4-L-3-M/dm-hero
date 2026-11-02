<template>
  <div class="d-flex flex-column ga-2">
    <div v-for="t in recent" :key="`${t.subject_id}-${t.player_id}-${t.kind}`" class="rep-row rounded pa-1" role="button" tabindex="0" @click="openSubject(t)">
      <div class="d-flex align-center mb-1">
        <v-icon size="x-small" class="mr-1 text-medium-emphasis">{{ ICONS[t.subject_type] }}</v-icon>
        <span class="text-body-medium font-weight-medium text-truncate">{{ t.subject_name }}</span>
        <v-chip v-if="t.player_id" size="x-small" variant="tonal" class="ml-2 flex-shrink-0" prepend-icon="mdi-account">{{ t.player_name }}</v-chip>
      </div>
      <RepBar :points="t.points" :type="t.subject_type" :kind="t.kind" small />
    </div>
    <div v-if="!recent.length" class="text-body-medium text-medium-emphasis">{{ $t('dashboardBoards.cards.reputation.empty') }}</div>
  </div>
</template>

<script setup lang="ts">
import RepBar from '~/components/reputation/RepBar.vue'
import { toPreviewType } from '~/stores/entityTabs'
import type { RepTrack } from '~~/types/reputation'

/** Who's moved lately — party-wide and per-player bars, newest change first. */
const rep = useReputationStore()
const tabs = useEntityTabsStore()
const ICONS: Record<string, string> = { NPC: 'mdi-account', Faction: 'mdi-shield-account', Location: 'mdi-map-marker' }

const recent = computed(() => rep.tracks
  .slice()
  .sort((a, b) => (b.last_change ?? '').localeCompare(a.last_change ?? ''))
  .slice(0, 12))
function openSubject(t: RepTrack) {
  const p = toPreviewType(t.subject_type)
  if (p) tabs.open(p, t.subject_id, t.subject_name)
}
</script>

<style scoped>
.rep-row {
  cursor: pointer;
}
.rep-row:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
