<template>
  <div v-if="plan.groups.value.length" class="d-flex flex-column ga-3">
    <div v-for="g in plan.groups.value" :key="g.key">
      <!-- Quest / cluster: click to read its notes -->
      <div class="group-head d-flex align-start rounded pa-1" role="button" tabindex="0" @click="toggle(g.key)" @keyup.enter="toggle(g.key)">
        <v-icon size="small" class="mr-1 mt-1" color="primary">{{ g.cluster ? 'mdi-script-text' : 'mdi-creation' }}</v-icon>
        <div class="flex-grow-1 min-w-0">
          <div class="font-weight-bold">{{ g.cluster?.title ?? $t('dashboardBoards.cards.sessionQuests.loose') }}</div>
          <EntityLink v-if="g.cluster?.quest_id" :id="g.cluster.quest_id" type="quest" :name="g.cluster.quest_name" class="text-body-small" @click.stop />
        </div>
        <v-icon v-if="g.cluster?.notes" size="small" class="text-medium-emphasis mt-1">{{ open.has(g.key) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
      </div>
      <div v-if="g.cluster?.notes && open.has(g.key)" class="details text-body-small ml-7 mb-1">{{ summaryText(g.cluster.notes) }}</div>

      <!-- Beats: click one to read it -->
      <div v-for="b in g.beats" :key="b.id" class="ml-5">
        <div class="beat d-flex align-start rounded pa-1" role="button" tabindex="0" @click="toggle(`b${b.id}`)" @keyup.enter="toggle(`b${b.id}`)">
          <v-icon size="x-small" class="mr-2 mt-1" :color="b.status === 'played' ? 'success' : undefined">{{ b.status === 'played' ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
          <div class="flex-grow-1 min-w-0 text-body-medium" :class="{ 'text-medium-emphasis': b.status === 'played' }">
            {{ b.title }}
            <span v-if="b.location_name" class="text-body-small text-medium-emphasis">· {{ b.location_name }}</span>
          </div>
          <v-icon v-if="hasDetails(b)" size="small" class="text-medium-emphasis">{{ open.has(`b${b.id}`) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </div>
        <div v-if="open.has(`b${b.id}`) && hasDetails(b)" class="details ml-6 mb-2">
          <div v-if="b.body" class="text-body-small mb-1">{{ summaryText(b.body) }}</div>
          <div v-if="b.location_id || b.entities.length" class="d-flex flex-wrap ga-1">
            <v-chip v-if="b.location_id" size="x-small" variant="tonal" prepend-icon="mdi-map-marker">
              <EntityLink :id="b.location_id" type="Location" :name="b.location_name" />
            </v-chip>
            <v-chip v-for="e in b.entities" :key="`${e.type}${e.id}`" size="x-small" variant="tonal">
              <EntityLink :id="e.id" :type="e.type" :name="e.name" />
            </v-chip>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-body-medium text-medium-emphasis">
    {{ $t('dashboardBoards.cards.sessionQuests.empty') }}
    <v-btn variant="text" size="small" color="primary" to="/story">{{ $t('dashboardBoards.toStory') }}</v-btn>
  </div>
</template>

<script setup lang="ts">
import EntityLink from '~/components/shared/EntityLink.vue'
import type { StoryBeat } from '~~/types/story'

/** The current session's questline: tray beats grouped by quest. Click to read the details. */
const plan = useSessionPlan()
const open = ref(new Set<string>())
function toggle(key: string) {
  const next = new Set(open.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  open.value = next
}
const hasDetails = (b: StoryBeat) => !!(b.body || b.location_id || b.entities.length)
</script>

<style scoped>
.group-head,
.beat {
  cursor: pointer;
}
.group-head:hover,
.beat:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
.details {
  white-space: pre-line;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.35);
  padding-left: 8px;
}
.min-w-0 {
  min-width: 0;
}
</style>
