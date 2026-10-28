<template>
  <v-dialog v-model="dialogOpen" :max-width="showShopTab ? 900 : 700" scrollable>
    <v-card v-if="entity">
      <v-card-title class="d-flex align-center">
        <v-icon :icon="entityIcon" :color="entityColor" class="mr-2" />
        {{ entity.name }}
        <template v-if="normalizedEntityType === 'player' && entity.player_name">
          <span class="text-body-medium text-medium-emphasis ml-2">
            ({{ entity.player_name }})
          </span>
        </template>
        <v-spacer />
        <SharedPinButton v-if="entityId" :entity-id="entityId" variant="icon" size="small" />
      </v-card-title>

      <v-tabs v-if="showShopTab" v-model="previewTab" density="compact" class="px-2">
        <v-tab value="overview">
          <v-icon start>mdi-information</v-icon>
          {{ $t('common.details') }}
        </v-tab>
        <v-tab value="shop">
          <v-icon start>mdi-store</v-icon>
          {{ $t('shop.title') }}
        </v-tab>
      </v-tabs>

      <v-card-text v-if="showShopTab && previewTab === 'shop'" style="max-height: 70vh">
        <LocationShopTab :location-id="entityId!" />
      </v-card-text>

      <v-card-text v-else style="max-height: 60vh">
        <!-- NPC Details -->
        <template v-if="normalizedEntityType === 'npc'">
          <v-img
            v-if="entity.image_url"
            :src="`/uploads/${entity.image_url}`"
            :alt="entity.name"
            max-height="420"
            class="mb-4 rounded preview-image"
          />
          <div v-if="entity.description" class="text-body-large mb-4" style="white-space: pre-wrap">
            {{ entity.description }}
          </div>
          <v-divider class="my-4" />
          <div class="text-body-medium">
            <div v-if="entity.race" class="mb-2">
              <strong>{{ $t('npcs.race') }}:</strong> {{ entity.race }}
            </div>
            <div v-if="Array.isArray(entity.class) ? entity.class.length > 0 : entity.class" class="mb-2">
              <strong>{{ $t('npcs.class') }}:</strong> {{ Array.isArray(entity.class) ? entity.class.join(', ') : entity.class }}
            </div>
            <div v-if="entity.faction" class="mb-2">
              <strong>{{ $t('npcs.faction') }}:</strong> {{ entity.faction }}
            </div>
          </div>
          <div v-if="entity.notes" class="mt-4">
            <strong>{{ $t('common.notes') }}:</strong>
            <div class="text-body-medium mt-2" style="white-space: pre-wrap">{{ entity.notes }}</div>
          </div>

          <!-- Linked NPCs -->
          <template v-if="linkedNpcs.length > 0">
            <v-divider class="my-4" />
            <strong>{{ $t('npcs.relations') }}</strong>
            <v-list density="compact" class="mt-2">
              <v-list-item v-for="rel in linkedNpcs" :key="rel.id">
                <template #prepend>
                  <v-avatar v-if="rel.image_url" size="32" class="mr-2">
                    <v-img :src="`/uploads/${rel.image_url}`" />
                  </v-avatar>
                  <v-icon v-else size="small" class="mr-2">mdi-account</v-icon>
                </template>
                <v-list-item-title>{{ rel.related_npc_name }}</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip size="x-small" variant="tonal" color="primary">
                    {{ $t(`npcs.npcRelationTypes.${rel.relation_type}`, rel.relation_type) }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </template>

          <!-- Linked Players -->
          <template v-if="linkedPlayers.length > 0">
            <v-divider class="my-4" />
            <strong>{{ $t('nav.players') }}</strong>
            <v-list density="compact" class="mt-2">
              <v-list-item v-for="p in linkedPlayers" :key="p.id">
                <template #prepend>
                  <v-avatar v-if="p.image_url" size="32" class="mr-2">
                    <v-img :src="`/uploads/${p.image_url}`" />
                  </v-avatar>
                  <v-icon v-else size="small" class="mr-2">mdi-account-star</v-icon>
                </template>
                <v-list-item-title>{{ p.name }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </template>

          <!-- Stats -->
          <SharedEntityPreviewStats v-if="entityId" :entity-id="entityId" />
        </template>

        <!-- Location Details -->
        <template v-if="normalizedEntityType === 'location'">
          <v-img
            v-if="entity.image_url"
            :src="`/uploads/${entity.image_url}`"
            :alt="entity.name"
            max-height="420"
            class="mb-4 rounded preview-image"
          />
          <div v-if="entity.description" class="text-body-large mb-4" style="white-space: pre-wrap">
            {{ entity.description }}
          </div>
          <v-divider class="my-4" />
          <div class="text-body-medium">
            <div v-if="entity.type" class="mb-2">
              <strong>{{ $t('locations.type') }}:</strong> {{ entity.type }}
            </div>
            <div v-if="entity.region" class="mb-2">
              <strong>{{ $t('locations.region') }}:</strong> {{ entity.region }}
            </div>
          </div>
          <div v-if="entity.notes" class="mt-4">
            <strong>{{ $t('common.notes') }}:</strong>
            <div class="text-body-medium mt-2" style="white-space: pre-wrap">{{ entity.notes }}</div>
          </div>
        </template>

        <!-- Item Details -->
        <template v-if="normalizedEntityType === 'item'">
          <div class="position-relative">
            <v-img
              v-if="entity.image_url"
              :src="`/uploads/${entity.image_url}`"
              :alt="entity.name"
              max-height="420"
              class="mb-4 rounded preview-image"
            />
            <v-chip
              v-if="entity.rarity"
              :color="getRarityColor(entity.rarity)"
              class="position-absolute"
              style="top: 8px; right: 8px"
            >
              {{ $t(`items.rarities.${entity.rarity}`) }}
            </v-chip>
          </div>
          <div v-if="entity.description" class="text-body-large mb-4" style="white-space: pre-wrap">
            {{ entity.description }}
          </div>
          <v-divider class="my-4" />
          <div class="d-flex flex-wrap ga-2 mb-3">
            <v-chip v-if="entity.type" variant="tonal">
              <v-icon start>mdi-tag</v-icon>
              {{ $t(`items.types.${entity.type}`) }}
            </v-chip>
            <v-chip v-if="entity.attunement" color="purple" variant="tonal">
              <v-icon start>mdi-auto-fix</v-icon>
              {{ $t('items.requiresAttunement') }}
            </v-chip>
          </div>
          <div v-if="entity.notes" class="mt-4">
            <strong>{{ $t('common.notes') }}:</strong>
            <div class="text-body-medium mt-2" style="white-space: pre-wrap">{{ entity.notes }}</div>
          </div>
        </template>

        <!-- Faction Details -->
        <template v-if="normalizedEntityType === 'faction'">
          <v-img
            v-if="entity.image_url"
            :src="`/uploads/${entity.image_url}`"
            :alt="entity.name"
            max-height="420"
            class="mb-4 rounded preview-image"
          />
          <div v-if="entity.description" class="text-body-large mb-4" style="white-space: pre-wrap">
            {{ entity.description }}
          </div>
          <v-divider class="my-4" />
          <div class="text-body-medium">
            <div v-if="entity.leader" class="mb-2">
              <strong>{{ $t('factions.leader') }}:</strong> {{ entity.leader }}
            </div>
            <div v-if="entity.alignment" class="mb-2">
              <strong>{{ $t('factions.alignment') }}:</strong> {{ entity.alignment }}
            </div>
          </div>
          <div v-if="entity.goals" class="mt-4">
            <strong>{{ $t('factions.goals') }}:</strong>
            <div class="text-body-medium mt-2" style="white-space: pre-wrap">{{ entity.goals }}</div>
          </div>
          <div v-if="entity.notes" class="mt-4">
            <strong>{{ $t('common.notes') }}:</strong>
            <div class="text-body-medium mt-2" style="white-space: pre-wrap">{{ entity.notes }}</div>
          </div>
        </template>

        <!-- Lore Details -->
        <template v-if="normalizedEntityType === 'lore'">
          <v-img
            v-if="entity.image_url"
            :src="`/uploads/${entity.image_url}`"
            :alt="entity.name"
            max-height="420"
            class="mb-4 rounded preview-image"
          />
          <div v-if="entity.description" class="text-body-large mb-4" style="white-space: pre-wrap">
            {{ entity.description }}
          </div>
          <v-divider class="my-4" />
          <div class="text-body-medium">
            <div v-if="entity.type" class="mb-2">
              <strong>{{ $t('lore.type') }}:</strong>
              {{ $t(`lore.types.${entity.type}`) }}
            </div>
            <div v-if="entity.date" class="mb-2">
              <strong>{{ $t('lore.date') }}:</strong> {{ entity.date }}
            </div>
          </div>
          <div v-if="entity.notes" class="mt-4">
            <strong>{{ $t('common.notes') }}:</strong>
            <div class="text-body-medium mt-2" style="white-space: pre-wrap">{{ entity.notes }}</div>
          </div>
        </template>

        <!-- Player Details -->
        <template v-if="normalizedEntityType === 'player'">
          <v-img
            v-if="entity.image_url"
            :src="`/uploads/${entity.image_url}`"
            :alt="entity.name"
            max-height="420"
            class="mb-4 rounded preview-image"
          />
          <div v-if="entity.description" class="text-body-large mb-4" style="white-space: pre-wrap">
            {{ entity.description }}
          </div>
          <v-divider class="my-4" />
          <div class="text-body-medium">
            <div v-if="entity.player_name" class="mb-2">
              <strong>{{ $t('players.playerName') }}:</strong> {{ entity.player_name }}
            </div>
            <div v-if="entity.email" class="mb-2">
              <strong>{{ $t('players.email') }}:</strong> {{ entity.email }}
            </div>
            <div v-if="entity.discord" class="mb-2">
              <strong>{{ $t('players.discord') }}:</strong> {{ entity.discord }}
            </div>
          </div>
          <div v-if="entity.notes" class="mt-4">
            <strong>{{ $t('common.notes') }}:</strong>
            <div class="text-body-medium mt-2" style="white-space: pre-wrap">{{ entity.notes }}</div>
          </div>
          <!-- Stats -->
          <SharedEntityPreviewStats v-if="entityId" :entity-id="entityId" />
        </template>
      </v-card-text>

      <v-card-actions>
        <v-btn variant="text" prepend-icon="mdi-open-in-new" @click="goToPage">
          {{ $t('sessions.goToPage') }}
        </v-btn>
        <v-btn v-if="fullDialog" variant="tonal" color="primary" prepend-icon="mdi-arrow-expand" @click="fullOpen = true">
          {{ $t('preview.openFull') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="close">
          {{ $t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- The full page (all tabs, editing, shop) right here, without leaving this page -->
  <component
    :is="fullDialog.component"
    v-if="fullDialog && fullOpen"
    v-model:show="fullOpen"
    v-bind="{ [fullDialog.idProp]: entityId }"
    @saved="entityId && loadEntity(entityId)"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import LocationShopTab from '~/components/locations/LocationShopTab.vue'
import { isShopLocationType } from '~~/types/shop'

export type EntityPreviewType = 'npc' | 'location' | 'item' | 'faction' | 'lore' | 'player'

interface Props {
  modelValue: boolean
  entityType: EntityPreviewType
  entityId: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'navigate': [type: EntityPreviewType, id: number, name: string]
}>()

const router = useRouter()
const { getItemTypeIcon, getLocationTypeIcon } = useEntityIcons()

// Dialog state
const dialogOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

// Entity data - using generic interface for all entity types
interface GenericEntity {
  id: number
  name: string
  description?: string | null
  image_url?: string | null
  notes?: string | null
  [key: string]: unknown
}
const entity = ref<GenericEntity | null>(null)
const loading = ref(false)

// NPC relations data
interface LinkedNpc {
  id: number
  related_npc_name: string
  relation_type: string
  image_url: string | null
}
interface LinkedPlayer {
  id: number
  name: string
  image_url: string | null
}
const linkedNpcs = ref<LinkedNpc[]>([])
const linkedPlayers = ref<LinkedPlayer[]>([])

// Entity type config
const entityConfig: Record<
  EntityPreviewType,
  { icon: string, color: string, endpoint: string, route: string }
> = {
  npc: { icon: 'mdi-account', color: 'blue', endpoint: '/api/npcs', route: '/npcs' },
  location: { icon: 'mdi-map-marker', color: 'green', endpoint: '/api/locations', route: '/locations' },
  item: { icon: 'mdi-sword', color: 'amber', endpoint: '/api/items', route: '/items' },
  faction: { icon: 'mdi-flag', color: 'purple', endpoint: '/api/factions', route: '/factions' },
  lore: { icon: 'mdi-book-open-variant', color: 'orange', endpoint: '/api/lore', route: '/lore' },
  player: { icon: 'mdi-account-star', color: 'pink', endpoint: '/api/players', route: '/players' },
}

// Normalized entity type for consistent lookups
const normalizedEntityType = computed(() => props.entityType.toLowerCase() as EntityPreviewType)

// Locations that sell things get a Shop tab right in the popout
const previewTab = ref<'overview' | 'shop'>('overview')
const showShopTab = computed(() =>
  normalizedEntityType.value === 'location'
  && isShopLocationType((entity.value?.metadata as { type?: string } | null)?.type ?? (entity.value as { type?: string } | null)?.type),
)

// "Open full": the entity's full dialog (every tab) on top of the current page
const FULL_DIALOGS: Record<EntityPreviewType, { component: ReturnType<typeof defineAsyncComponent>, idProp: string }> = {
  npc: { component: defineAsyncComponent(() => import('~/components/npcs/NpcEditDialog.vue')), idProp: 'npcId' },
  location: { component: defineAsyncComponent(() => import('~/components/locations/LocationEditDialog.vue')), idProp: 'locationId' },
  item: { component: defineAsyncComponent(() => import('~/components/items/ItemEditDialog.vue')), idProp: 'itemId' },
  faction: { component: defineAsyncComponent(() => import('~/components/factions/FactionEditDialog.vue')), idProp: 'factionId' },
  lore: { component: defineAsyncComponent(() => import('~/components/lore/LoreEditDialog.vue')), idProp: 'loreId' },
  player: { component: defineAsyncComponent(() => import('~/components/players/PlayerEditDialog.vue')), idProp: 'playerId' },
}
const fullDialog = computed(() => (props.entityId ? FULL_DIALOGS[normalizedEntityType.value] ?? null : null))
const fullOpen = ref(false)
watch(() => [props.entityId, props.modelValue], () => {
  previewTab.value = 'overview'
})

const entityIcon = computed(() => {
  const baseIcon = entityConfig[normalizedEntityType.value]?.icon || 'mdi-help'
  if (!entity.value) return baseIcon

  // Use type-specific icons for items and locations
  if (normalizedEntityType.value === 'item') {
    const itemType = (entity.value.metadata as { type?: string } | null)?.type
    return getItemTypeIcon(itemType)
  }
  if (normalizedEntityType.value === 'location') {
    const locationType = (entity.value.metadata as { type?: string } | null)?.type
    return getLocationTypeIcon(locationType)
  }
  return baseIcon
})
const entityColor = computed(() => entityConfig[normalizedEntityType.value]?.color || 'grey')

// Load entity when ID or type changes
watch(
  () => [props.entityId, props.entityType, props.modelValue],
  async ([newId, _type, isOpen]) => {
    if (newId && isOpen) {
      await loadEntity(newId as number)
    }
  },
  { immediate: true },
)

async function loadEntity(id: number) {
  loading.value = true
  try {
    const config = entityConfig[normalizedEntityType.value]
    if (!config) {
      console.error('Unknown entity type:', props.entityType)
      entity.value = null
      return
    }
    entity.value = await $fetch<GenericEntity>(`${config.endpoint}/${id}`)

    // Load NPC relations and players
    linkedNpcs.value = []
    linkedPlayers.value = []
    if (normalizedEntityType.value === 'npc') {
      try {
        const [npcRels, players] = await Promise.all([
          $fetch<LinkedNpc[]>(`/api/npcs/${id}/relations`),
          $fetch<LinkedPlayer[]>(`/api/npcs/${id}/linked-players`),
        ])
        linkedNpcs.value = npcRels
        linkedPlayers.value = players
      }
      catch (e) {
        console.error('[Preview] Failed to load relations:', e)
      }
    }
  }
  catch (error) {
    console.error('Failed to load entity:', error)
    entity.value = null
  }
  finally {
    loading.value = false
  }
}

function getRarityColor(rarity: unknown): string {
  const colors: Record<string, string> = {
    common: 'grey',
    uncommon: 'green',
    rare: 'blue',
    very_rare: 'purple',
    legendary: 'orange',
    artifact: 'red',
  }
  return (typeof rarity === 'string' && colors[rarity]) || 'grey'
}

function goToPage() {
  if (!entity.value) return
  const config = entityConfig[normalizedEntityType.value]
  if (!config) return
  const entityName = entity.value.name as string
  // Use search + highlight params so the entity is visible and highlighted
  router.push(`${config.route}?search=${encodeURIComponent(entityName)}&highlight=${props.entityId}`)
  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>
