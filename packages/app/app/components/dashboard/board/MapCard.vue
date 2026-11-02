<template>
  <div class="map-card h-100 d-flex flex-column">
    <div v-if="maps.length > 1" class="px-2 pt-2 flex-shrink-0">
      <v-select
        :model-value="current?.id ?? null"
        :items="maps"
        item-title="name"
        item-value="id"
        density="compact"
        variant="outlined"
        hide-details
        @update:model-value="$emit('pick', $event)"
      />
    </div>
    <div class="flex-grow-1 position-relative map-card__view">
      <ClientOnly>
        <MapsMapViewer v-if="details" :key="details.id" :map="details" :markers="markers" :areas="details.areas" @marker-click="open" />
      </ClientOnly>
      <div v-if="!maps.length" class="pa-3 text-body-medium text-medium-emphasis">{{ $t('dashboardBoards.cards.map.empty') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CampaignMap, MapArea, MapMarker } from '~~/types/map'
import type { EntityPreviewType } from '~/components/shared/EntityPreviewDialog.vue'

/** A live map on the dashboard: pins in their category colours, click one to open it. */
const props = defineProps<{ campaignId: number, mapId?: number | null }>()
defineEmits<{ pick: [mapId: number] }>()
const tabs = useEntityTabsStore()
const places = usePlacesStore()

const maps = ref<CampaignMap[]>([])
const details = ref<(CampaignMap & { markers: MapMarker[], areas: MapArea[] }) | null>(null)
const current = computed(() => maps.value.find(m => m.id === props.mapId) ?? maps.value.find(m => !m.parent_map_id) ?? maps.value[0] ?? null)

async function loadMaps() {
  maps.value = await $fetch<CampaignMap[]>('/api/maps', { query: { campaignId: props.campaignId } }).catch(() => [])
  places.load(props.campaignId)
}
watch(() => props.campaignId, loadMaps, { immediate: true })
watch(current, async (m) => {
  details.value = m ? await $fetch<typeof details.value>(`/api/maps/${m.id}`).catch(() => null) : null
}, { immediate: true })

const markers = computed(() => (details.value?.markers ?? []).map((m) => {
  const cat = m.entity_type === 'Location' ? places.categoryOf(m.entity_id) : null
  return cat ? { ...m, custom_color: m.custom_color ?? cat.color, custom_icon: m.custom_icon ?? cat.icon } : m
}))
function open(m: MapMarker) {
  const type = (m.entity_type ?? '').toLowerCase()
  if (['npc', 'location', 'item', 'faction', 'lore', 'player'].includes(type)) tabs.open(type as EntityPreviewType, m.entity_id, m.entity_name ?? '')
}
</script>

<style scoped>
.map-card__view {
  min-height: 0;
}
.map-card__view :deep(> *) {
  height: 100%;
}
</style>
