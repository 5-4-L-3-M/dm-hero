<template>
  <v-card v-if="rows.length > 0" variant="outlined" class="mb-4">
    <v-card-title class="d-flex align-center flex-wrap ga-2">
      <v-icon start>mdi-bag-personal</v-icon>
      {{ $t('inventory.partyLoad') }}
      <v-spacer />
      <span class="text-body-small text-medium-emphasis">{{ $t('inventory.partyLoadHint') }}</span>
    </v-card-title>
    <v-card-text>
      <v-row dense>
        <v-col v-for="row in rows" :key="row.player_id" cols="12" sm="6" lg="4">
          <v-sheet
            border
            rounded="lg"
            class="pa-3 party-load__row"
            role="button"
            tabindex="0"
            @click="emit('open', row.player_id)"
            @keyup.enter="emit('open', row.player_id)"
          >
            <div class="d-flex align-center mb-2">
              <v-avatar size="36" class="mr-3" :color="row.image_url ? undefined : 'surface-variant'">
                <v-img v-if="row.image_url" :src="`/uploads/${row.image_url}`" cover />
                <v-icon v-else size="20">mdi-account-star</v-icon>
              </v-avatar>
              <div class="flex-grow-1" style="min-width: 0">
                <div class="font-weight-medium text-truncate">{{ row.name }}</div>
                <div class="text-body-small text-medium-emphasis text-no-wrap">
                  {{ formatWeight(row.carried) || `0 ${weightUnit}` }}
                  <template v-if="row.thresholds"> / {{ formatWeight(row.thresholds.capacity) }}</template>
                </div>
              </div>
              <v-chip size="small" :color="loadStatusColor(row.status)" variant="flat" class="ml-2">
                {{ $t(`inventory.status.${row.status}`) }}
              </v-chip>
            </div>
            <CarryLoadBar :carried="row.carried" :thresholds="row.thresholds" :status="row.status" compact />
            <div v-if="row.missing_weights > 0" class="text-body-small text-warning mt-1">
              {{ $t('inventory.missingWeights', { count: row.missing_weights }, row.missing_weights) }}
            </div>
          </v-sheet>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import CarryLoadBar from '~/components/players/CarryLoadBar.vue'
import type { PartyLoadEntry } from '~~/types/inventory'

const props = defineProps<{ campaignId: number | null }>()
const emit = defineEmits<{ open: [playerId: number] }>()

const { formatWeight, weightUnit } = useUnits()
const rows = ref<PartyLoadEntry[]>([])

async function refresh() {
  if (!props.campaignId) {
    rows.value = []
    return
  }
  try {
    rows.value = await $fetch<PartyLoadEntry[]>('/api/players/party-load', {
      query: { campaignId: props.campaignId },
    })
  }
  catch (error) {
    console.error('Failed to load party load:', error)
    rows.value = []
  }
}

// Client-only: $fetch during SSR isn't transferred, which caused a hydration mismatch
onMounted(refresh)
watch(() => props.campaignId, refresh)

defineExpose({ refresh })
</script>

<style scoped>
.party-load__row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.party-load__row:hover,
.party-load__row:focus-visible {
  background-color: rgba(var(--v-theme-on-surface), 0.05);
}
</style>
