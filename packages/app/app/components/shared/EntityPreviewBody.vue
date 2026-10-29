<template>
  <div>
    <v-progress-linear v-if="loading && !entity" indeterminate class="mb-3" />

    <template v-if="entity">
      <v-tabs v-if="showShopTab" v-model="previewTab" density="compact" class="mb-3">
        <v-tab value="overview">
          <v-icon start>mdi-information</v-icon>
          {{ $t('common.details') }}
        </v-tab>
        <v-tab value="shop">
          <v-icon start>mdi-store</v-icon>
          {{ $t('shop.title') }}
        </v-tab>
      </v-tabs>

      <LocationShopTab v-if="showShopTab && previewTab === 'shop'" :location-id="entityId!" />

      <div v-else>
        <!-- NPC Details -->
        <template v-if="type === 'npc'">
          <v-img
            v-if="entity.image_url"
            :src="`/uploads/${entity.image_url}`"
            :alt="entity.name"
            max-height="420"
            class="mb-4 rounded preview-image"
          />
          <SharedFormattedText v-if="entity.description" :text="entity.description" class="text-body-large mb-4" />
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
            <SharedFormattedText :text="entity.notes" class="text-body-medium mt-2" />
          </div>
        </template>

        <!-- Location Details -->
        <template v-if="type === 'location'">
          <v-img
            v-if="entity.image_url"
            :src="`/uploads/${entity.image_url}`"
            :alt="entity.name"
            max-height="420"
            class="mb-4 rounded preview-image"
          />
          <SharedFormattedText v-if="entity.description" :text="entity.description" class="text-body-large mb-4" />
          <v-divider class="my-4" />
          <div class="text-body-medium">
            <div v-if="locationType" class="mb-2">
              <strong>{{ $t('locations.type') }}:</strong> {{ $t(`locations.types.${locationType}`, locationType) }}
            </div>
            <div v-if="entity.region" class="mb-2">
              <strong>{{ $t('locations.region') }}:</strong> {{ entity.region }}
            </div>
          </div>
          <div v-if="entity.notes" class="mt-4">
            <strong>{{ $t('common.notes') }}:</strong>
            <SharedFormattedText :text="entity.notes" class="text-body-medium mt-2" />
          </div>
        </template>

        <!-- Item Details -->
        <template v-if="type === 'item'">
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
          <SharedFormattedText v-if="entity.description" :text="entity.description" class="text-body-large mb-4" />
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
            <SharedFormattedText :text="entity.notes" class="text-body-medium mt-2" />
          </div>
        </template>

        <!-- Faction Details -->
        <template v-if="type === 'faction'">
          <v-img
            v-if="entity.image_url"
            :src="`/uploads/${entity.image_url}`"
            :alt="entity.name"
            max-height="420"
            class="mb-4 rounded preview-image"
          />
          <SharedFormattedText v-if="entity.description" :text="entity.description" class="text-body-large mb-4" />
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
            <SharedFormattedText :text="String(entity.goals)" class="text-body-medium mt-2" />
          </div>
          <div v-if="entity.notes" class="mt-4">
            <strong>{{ $t('common.notes') }}:</strong>
            <SharedFormattedText :text="entity.notes" class="text-body-medium mt-2" />
          </div>
          <template v-if="campaignId && entityId">
            <v-divider class="my-4" />
            <FactionAgendaList :campaign-id="campaignId" :faction-id="entityId" />
          </template>
        </template>

        <!-- Quest Details: everything at a glance, objectives tickable -->
        <template v-if="type === 'quest'">
          <div class="d-flex flex-wrap ga-1 mb-3">
            <v-chip size="small" :color="QUEST_COLORS[quest.status]" variant="flat">
              <v-icon start size="small">{{ QUEST_STATUS_ICONS[quest.status] }}</v-icon>{{ $t(`quests.statuses.${quest.status}`) }}
            </v-chip>
            <v-chip v-if="questStoryline" size="small" :color="`story-${questStoryline.color}`" variant="flat">{{ questStoryline.name }}</v-chip>
          </div>

          <div class="quest-facts text-body-medium mb-3">
            <template v-if="entity.giver_name">
              <v-icon size="small" class="text-medium-emphasis">mdi-account-voice</v-icon>
              <span class="text-medium-emphasis">{{ $t('quests.giver') }}</span>
              <SharedEntityLink :id="Number(entity.giver_id)" :type="giverType" :name="String(entity.giver_name)" />
            </template>
            <template v-if="entity.location_name">
              <v-icon size="small" class="text-medium-emphasis">mdi-map-marker</v-icon>
              <span class="text-medium-emphasis">{{ $t('quests.location') }}</span>
              <SharedEntityLink :id="Number(entity.location_id)" type="Location" :name="String(entity.location_name)" />
            </template>
            <template v-if="entity.reward">
              <v-icon size="small" class="text-medium-emphasis">mdi-treasure-chest</v-icon>
              <span class="text-medium-emphasis">{{ $t('quests.reward') }}</span>
              <span>{{ entity.reward }}</span>
            </template>
          </div>

          <div v-if="questInvolved.length" class="mb-3">
            <div class="text-body-small text-medium-emphasis mb-1">{{ $t('quests.involved') }}</div>
            <div class="d-flex flex-wrap ga-1">
              <v-chip v-for="e in questInvolved" :key="e.id" size="small" variant="tonal">
                <v-icon start size="small">{{ toPreviewType(e.type) ? ENTITY_PREVIEW_CONFIG[toPreviewType(e.type)!].icon : 'mdi-link' }}</v-icon>
                <SharedEntityLink :id="e.id" :type="e.type" :name="e.name" />
              </v-chip>
            </div>
          </div>

          <SharedFormattedText v-if="entity.description" :text="entity.description" class="text-body-large mb-4" />

          <template v-if="quest.objectives.length">
            <div class="d-flex align-center mb-1">
              <strong>{{ $t('quests.objectives') }}</strong>
              <v-spacer />
              <span class="text-body-small text-medium-emphasis">{{ $t('quests.objectivesDone', { done: questDone, total: quest.objectives.length }) }}</span>
            </div>
            <v-progress-linear :model-value="(questDone / quest.objectives.length) * 100" :color="QUEST_COLORS[quest.status]" height="6" rounded class="mb-2" />
            <div v-for="(o, i) in quest.objectives" :key="i" class="d-flex align-center">
              <v-checkbox-btn :model-value="o.done" density="compact" class="flex-grow-0" @update:model-value="toggleObjective(i, !!$event)" />
              <span :class="{ 'text-decoration-line-through text-medium-emphasis': o.done }">{{ o.text }}</span>
            </div>
          </template>
        </template>

        <!-- Lore Details -->
        <template v-if="type === 'lore'">
          <v-img
            v-if="entity.image_url"
            :src="`/uploads/${entity.image_url}`"
            :alt="entity.name"
            max-height="420"
            class="mb-4 rounded preview-image"
          />
          <SharedFormattedText v-if="entity.description" :text="entity.description" class="text-body-large mb-4" />
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
            <SharedFormattedText :text="entity.notes" class="text-body-medium mt-2" />
          </div>
        </template>

        <!-- Player Details -->
        <template v-if="type === 'player'">
          <v-img
            v-if="entity.image_url"
            :src="`/uploads/${entity.image_url}`"
            :alt="entity.name"
            max-height="420"
            class="mb-4 rounded preview-image"
          />
          <PlayerCharacterSummary :metadata="entity.metadata" class="mb-4" />
          <SharedFormattedText v-if="entity.description" :text="entity.description" class="text-body-large mb-4" />
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
            <SharedFormattedText :text="entity.notes" class="text-body-medium mt-2" />
          </div>
        </template>

        <!-- Connections: every linked entry, click to open it as a tab -->
        <template v-if="connections.length > 0">
          <v-divider class="my-4" />
          <div class="d-flex align-center mb-1">
            <strong>{{ $t('preview.connections') }}</strong>
            <v-chip size="x-small" class="ml-2">{{ connections.length }}</v-chip>
          </div>
          <v-list density="compact" class="py-0 bg-transparent">
            <v-list-item
              v-for="c in connections"
              :key="c.relationId"
              :disabled="!toPreviewType(c.entityType)"
              rounded
              class="px-1"
              @click="openConnection(c)"
            >
              <template #prepend>
                <v-avatar size="32" class="mr-1" :color="c.entityImageUrl ? undefined : c.entityColor" variant="tonal">
                  <v-img v-if="c.entityImageUrl" :src="`/uploads/${c.entityImageUrl}`" cover />
                  <v-icon v-else size="small" :icon="c.entityIcon || 'mdi-link'" />
                </v-avatar>
              </template>
              <v-list-item-title>{{ c.entityName }}</v-list-item-title>
              <v-list-item-subtitle>{{ relationLabel(c.relationType) }}</v-list-item-subtitle>
              <template v-if="toPreviewType(c.entityType)" #append>
                <v-icon size="small" class="text-medium-emphasis">mdi-tab-plus</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </template>

        <!-- Documents (DM secrets, letters, handouts) -->
        <template v-if="documents.length > 0">
          <v-divider class="my-4" />
          <strong>{{ $t('documents.title') }}</strong>
          <SharedEntityDocumentsView :documents="documents" empty-message="" class="mx-n4" />
        </template>

        <!-- Stats -->
        <SharedEntityPreviewStats v-if="entityId && (type === 'npc' || type === 'player')" :entity-id="entityId" />
      </div>
    </template>

    <div v-else-if="!loading" class="text-center text-medium-emphasis py-8">
      <v-icon size="48" class="mb-2">mdi-help-circle-outline</v-icon>
      <div>{{ $t('preview.notFound') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LocationShopTab from '~/components/locations/LocationShopTab.vue'
import PlayerCharacterSummary from '~/components/players/PlayerCharacterSummary.vue'
import { isShopLocationType } from '~~/types/shop'
import { ENTITY_PREVIEW_CONFIG } from '~/utils/entityPreview'
import { toPreviewType } from '~/stores/entityTabs'
import FactionAgendaList from '~/components/story/FactionAgendaList.vue'
import { QUEST_STATUS_ICONS, readQuestMetadata, type LinkedEntity, type QuestObjective, type QuestStatus } from '~~/types/story'
import type { EntityPreviewType } from './EntityPreviewDialog.vue'

/**
 * The read view of one entity — used by the quick-preview popup and by the
 * entry tabs side panel. Loads the entity, every connection (clickable, opens
 * as a tab), documents and stats; shops get a Shop tab.
 */
const props = defineProps<{
  entityType: EntityPreviewType
  entityId: number | null
}>()

const emit = defineEmits<{
  loaded: [entity: PreviewEntity | null]
  open: [type: EntityPreviewType, id: number, name: string]
}>()

export interface PreviewEntity {
  id: number
  name: string
  description?: string | null
  image_url?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
  [key: string]: unknown
}

interface Connection {
  relationId: number
  entityId: number
  entityName: string
  entityType: string
  entityIcon: string
  entityColor: string
  entityImageUrl: string | null
  relationType: string
  direction: 'outgoing' | 'incoming'
}

interface EntityDocument {
  id: number
  title: string
  content: string
  file_type?: 'markdown' | 'pdf'
  file_path?: string
}

const { relationLabel } = useRelationLabel()

const type = computed(() => props.entityType.toLowerCase() as EntityPreviewType)
const entity = ref<PreviewEntity | null>(null)
const connections = ref<Connection[]>([])
const documents = ref<EntityDocument[]>([])
const loading = ref(false)
const previewTab = ref<'overview' | 'shop'>('overview')

const locationType = computed(() =>
  ((entity.value?.metadata as { type?: string } | null)?.type ?? (entity.value as { type?: string } | null)?.type) || null,
)
const showShopTab = computed(() => type.value === 'location' && isShopLocationType(locationType.value ?? undefined))

const campaignId = computed(() => useCampaignStore().activeCampaignIdNumber)

// Quests: status + objectives (tick them off right here)
const QUEST_COLORS: Record<QuestStatus, string> = { rumor: 'warning', active: 'primary', completed: 'success', failed: 'error' }
const quest = computed(() => readQuestMetadata(entity.value ?? {}))
const questDone = computed(() => quest.value.objectives.filter(o => o.done).length)
const questInvolved = computed(() => (Array.isArray(entity.value?.involved) ? entity.value.involved as LinkedEntity[] : []))
const storyStore = useStoryBoardStore()
const questStoryline = computed(() => storyStore.storylines.find(l => l.id === quest.value.storyline_id) ?? null)
watch(() => type.value === 'quest' && campaignId.value, (id) => {
  if (id) storyStore.load(id)
}, { immediate: true })
// A quest saved anywhere else (quest board, full dialog) → show the new version
watch(() => storyStore.questVersion, () => {
  if (type.value === 'quest') load()
})
const giverType = computed(() => String(entity.value?.giver_type ?? 'NPC'))
async function toggleObjective(index: number, done: boolean) {
  if (!entity.value) return
  const objectives: QuestObjective[] = quest.value.objectives.map((o, i) => (i === index ? { ...o, done } : o))
  entity.value = { ...entity.value, objectives }
  await $fetch(`/api/quests/${entity.value.id}`, { method: 'PATCH', body: { objectives } })
}

let loadToken = 0
async function load() {
  const id = props.entityId
  const config = ENTITY_PREVIEW_CONFIG[type.value]
  previewTab.value = 'overview'
  if (!id || !config) {
    entity.value = null
    connections.value = []
    documents.value = []
    return
  }
  const token = ++loadToken
  loading.value = true
  try {
    const [e, conns, docs] = await Promise.all([
      $fetch<PreviewEntity>(`${config.endpoint}/${id}`).catch(() => null),
      $fetch<{ connections: Connection[] }>(`/api/entities/${id}/connections`).catch(() => ({ connections: [] })),
      $fetch<EntityDocument[]>(`/api/entities/${id}/documents`).catch(() => []),
    ])
    if (token !== loadToken) return // a newer entity was requested meanwhile
    entity.value = e
    connections.value = [...(conns?.connections ?? [])].sort((a, b) =>
      a.entityType.localeCompare(b.entityType) || a.entityName.localeCompare(b.entityName),
    )
    documents.value = Array.isArray(docs) ? docs : []
    emit('loaded', e)
  }
  finally {
    if (token === loadToken) loading.value = false
  }
}

watch(() => [props.entityId, props.entityType], load, { immediate: true })

function openConnection(c: Connection) {
  const t = toPreviewType(c.entityType)
  if (t) emit('open', t, c.entityId, c.entityName)
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

defineExpose({ reload: load })
</script>

<style scoped>
.quest-facts {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 6px 8px;
  align-items: center;
}
</style>
