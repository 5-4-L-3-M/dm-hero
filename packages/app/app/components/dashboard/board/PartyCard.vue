<template>
  <div v-if="rows.length" class="d-flex flex-column ga-2">
    <v-sheet
      v-for="row in rows"
      :key="row.player_id"
      border
      rounded="lg"
      class="pa-2 d-flex align-center row-btn"
      role="button"
      tabindex="0"
      @click="tabs.open('player', row.player_id, row.name)"
      @keyup.enter="tabs.open('player', row.player_id, row.name)"
    >
      <v-avatar size="40" class="mr-3" :color="row.image_url ? undefined : 'surface-variant'">
        <v-img v-if="row.image_url" :src="`/uploads/${row.image_url}`" cover />
        <v-icon v-else size="22">mdi-account-star</v-icon>
      </v-avatar>
      <div class="flex-grow-1" style="min-width: 0">
        <div class="font-weight-medium text-truncate">{{ row.name }}</div>
        <div v-if="row.player_name" class="text-body-small text-medium-emphasis text-truncate">{{ row.player_name }}</div>
      </div>
      <v-chip v-if="row.status !== 'normal' && row.status !== 'unknown'" size="x-small" :color="loadStatusColor(row.status)" variant="flat" class="ml-2">
        {{ $t(`inventory.status.${row.status}`) }}
      </v-chip>
    </v-sheet>
  </div>
  <div v-else class="text-body-medium text-medium-emphasis">{{ $t('dashboardBoards.cards.party.empty') }}</div>
</template>

<script setup lang="ts">
import type { PartyLoadEntry } from '~~/types/inventory'

/** The party at a glance; click someone to open them in the side panel. */
const props = defineProps<{ campaignId: number }>()
const tabs = useEntityTabsStore()
const rows = ref<PartyLoadEntry[]>([])

async function load() {
  rows.value = await $fetch<PartyLoadEntry[]>('/api/players/party-load', { query: { campaignId: props.campaignId } }).catch(() => [])
}
onMounted(load)
watch(() => props.campaignId, load)
</script>

<style scoped>
.row-btn {
  cursor: pointer;
}
.row-btn:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
