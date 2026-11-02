<template>
  <div class="d-flex flex-column">
    <div class="card-search pb-2">
      <v-text-field v-model="q" :placeholder="$t('dashboardBoards.cards.sessionNpcs.search')" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable />
    </div>
    <!-- Typing searches every NPC in the campaign; empty shows this session's -->
    <div v-if="shown.length" class="d-flex flex-column ga-1">
      <div
        v-for="n in shown"
        :key="n.id"
        class="npc-row d-flex align-center pa-1 rounded"
        role="button"
        tabindex="0"
        @click="tabs.open('npc', n.id, n.name)"
        @keyup.enter="tabs.open('npc', n.id, n.name)"
      >
        <v-avatar size="34" color="surface-variant" class="mr-2 text-body-small font-weight-bold">
          <v-img v-if="imageOf(n.id)" :src="`/uploads/${imageOf(n.id)}`" cover />
          <template v-else>{{ initials(n.name) }}</template>
        </v-avatar>
        <span class="flex-grow-1 text-truncate">{{ n.name }}</span>
        <v-chip v-if="tierOfNpc(n.id)" size="x-small" variant="tonal" :color="tierOfNpc(n.id)!.color" class="ml-1">
          {{ $t(`reputation.tiers.${tierOfNpc(n.id)!.key}`) }}
        </v-chip>
        <v-icon v-if="rep.isMet(n.id)" size="small" color="success" class="ml-1" :title="$t('dashboardBoards.cards.sessionNpcs.met')">mdi-handshake</v-icon>
        <v-icon v-else size="small" class="ml-1 text-disabled" :title="$t('dashboardBoards.cards.sessionNpcs.notMet')">mdi-account-question-outline</v-icon>
      </div>
    </div>
    <div v-else-if="searching" class="text-body-medium text-medium-emphasis">{{ $t('dashboardBoards.cards.sessionNpcs.noMatch') }}</div>
    <div v-else class="text-body-medium text-medium-emphasis">
      {{ $t('dashboardBoards.cards.sessionNpcs.empty') }}
      <v-btn variant="text" size="small" color="primary" to="/story">{{ $t('dashboardBoards.toStory') }}</v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { tierOf } from '~~/types/reputation'

/** NPCs tied to what's in the next-session tray — met badge and how they feel. */
const plan = useSessionPlan()
const rep = useReputationStore()
const tabs = useEntityTabsStore()
const story = useStoryBoardStore()
const q = ref('')
const searching = computed(() => !!(q.value ?? '').trim())
const shown = computed(() => {
  const needle = (q.value ?? '').toLowerCase().trim()
  if (!needle) return plan.npcs.value
  return story.entities.filter(e => e.type === 'NPC' && e.name.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40)
})
const imageOf = (id: number) => story.entities.find(e => e.id === id && e.type === 'NPC')?.image_url ?? null

function tierOfNpc(id: number) {
  const t = rep.tracksOf(id).find(x => x.player_id === 0)
  return t ? tierOf(t.points, 'NPC') : null
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
}
</script>

<style scoped>
.card-search {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}
.npc-row {
  cursor: pointer;
}
.npc-row:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
