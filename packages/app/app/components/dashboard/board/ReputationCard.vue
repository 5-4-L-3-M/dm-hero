<template>
  <div class="d-flex flex-column">
    <div class="card-search pb-2">
      <v-text-field v-model="q" :placeholder="$t('dashboardBoards.cards.reputation.search')" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable />
    </div>
    <!-- People, factions, places — each A to Z -->
    <section v-for="g in groups" :key="g.type" class="mb-2">
      <div class="group-head text-label-large text-medium-emphasis mb-1">
        <v-icon size="x-small" class="mr-1">{{ ICONS[g.type] }}</v-icon>{{ $t(`reputation.sections.${g.section}`) }}
        <span class="ml-1">({{ g.tracks.length }})</span>
      </div>
      <div class="d-flex flex-column ga-2">
        <div v-for="t in g.tracks" :key="`${t.subject_id}-${t.player_id}-${t.kind}`" class="rep-row rounded pa-1" role="button" tabindex="0" @click="openSubject(t)" @keyup.enter="openSubject(t)">
          <div class="d-flex align-center mb-1">
            <v-avatar v-if="imageOf(t.subject_id)" size="22" class="mr-2 flex-shrink-0"><v-img :src="`/uploads/${imageOf(t.subject_id)}`" cover /></v-avatar>
            <span class="text-body-medium font-weight-medium text-truncate">{{ t.subject_name }}</span>
            <v-chip v-if="t.player_id" size="x-small" variant="tonal" class="ml-2 flex-shrink-0" prepend-icon="mdi-account">{{ t.player_name }}</v-chip>
          </div>
          <RepBar :points="t.points" :type="t.subject_type" :kind="t.kind" small />
        </div>
      </div>
    </section>
    <div v-if="!groups.length" class="text-body-medium text-medium-emphasis">
      {{ q ? $t('dashboardBoards.cards.reputation.noMatch') : $t('dashboardBoards.cards.reputation.empty') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import RepBar from '~/components/reputation/RepBar.vue'
import { toPreviewType } from '~/stores/entityTabs'
import type { RepTrack } from '~~/types/reputation'

/** Every reputation track, split into people / factions / places, A to Z, with a quick search. */
const rep = useReputationStore()
const tabs = useEntityTabsStore()
const story = useStoryBoardStore()
const ICONS: Record<string, string> = { NPC: 'mdi-account', Faction: 'mdi-shield-account', Location: 'mdi-map-marker' }
const TYPES = [
  { type: 'NPC', section: 'people' },
  { type: 'Faction', section: 'factions' },
  { type: 'Location', section: 'places' },
] as const
const q = ref('')
const imageOf = (id: number) => story.entities.find(e => e.id === id)?.image_url ?? null

const groups = computed(() => {
  const needle = (q.value ?? '').toLowerCase().trim()
  const shown = rep.tracks.filter(t => !needle || t.subject_name.toLowerCase().includes(needle) || (t.player_name ?? '').toLowerCase().includes(needle))
  // Same subject: the party-wide bar first, then each player's
  const sorted = shown.slice().sort((a, b) => a.subject_name.localeCompare(b.subject_name) || (a.player_id ? 1 : 0) - (b.player_id ? 1 : 0) || (a.player_name ?? '').localeCompare(b.player_name ?? ''))
  return TYPES.map(g => ({ ...g, tracks: sorted.filter(t => t.subject_type === g.type) })).filter(g => g.tracks.length)
})
function openSubject(t: RepTrack) {
  const p = toPreviewType(t.subject_type)
  if (p) tabs.open(p, t.subject_id, t.subject_name)
}
</script>

<style scoped>
.card-search {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}
.group-head {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-bottom: 2px;
}
.rep-row {
  cursor: pointer;
}
.rep-row:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
