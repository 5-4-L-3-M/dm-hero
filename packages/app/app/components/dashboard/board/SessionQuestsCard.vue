<template>
  <div v-if="plan.groups.value.length" class="d-flex flex-column ga-3">
    <div v-for="g in plan.groups.value" :key="g.key">
      <div class="d-flex align-center mb-1">
        <v-icon size="small" class="mr-1" color="primary">{{ g.cluster ? 'mdi-script-text' : 'mdi-creation' }}</v-icon>
        <span class="font-weight-bold text-truncate">{{ g.cluster?.title ?? $t('dashboardBoards.cards.sessionQuests.loose') }}</span>
        <v-spacer />
        <EntityLink v-if="g.cluster?.quest_id" :id="g.cluster.quest_id" type="quest" :name="g.cluster.quest_name" class="text-body-small text-truncate ml-2" />
      </div>
      <div v-for="b in g.beats" :key="b.id" class="beat d-flex align-center text-body-medium pl-6">
        <v-icon size="x-small" class="mr-2" :color="b.status === 'played' ? 'success' : undefined">{{ b.status === 'played' ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
        <span class="text-truncate" :class="{ 'text-medium-emphasis': b.status === 'played' }">{{ b.title }}</span>
        <span v-if="b.location_name" class="text-body-small text-medium-emphasis ml-2 text-truncate">· {{ b.location_name }}</span>
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

/** The current session's questline: tray beats grouped by quest. */
const plan = useSessionPlan()
</script>

<style scoped>
.beat {
  min-height: 24px;
}
</style>
