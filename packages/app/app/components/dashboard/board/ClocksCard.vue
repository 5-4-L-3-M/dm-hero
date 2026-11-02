<template>
  <FactionAgendaList :campaign-id="campaignId" hide-title />
</template>

<script setup lang="ts">
import FactionAgendaList from '~/components/story/FactionAgendaList.vue'

/** Faction plans ticking in the background. */
defineProps<{ campaignId: number }>()
</script>
