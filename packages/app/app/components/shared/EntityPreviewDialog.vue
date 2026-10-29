<template>
  <v-dialog v-model="dialogOpen" :max-width="isShop ? 900 : 700" scrollable>
    <v-card v-if="entityId">
      <v-card-title class="d-flex align-center">
        <v-icon :icon="entityIcon" :color="entityColor" class="mr-2" />
        {{ entity?.name }}
        <template v-if="normalizedEntityType === 'player' && entity?.player_name">
          <span class="text-body-medium text-medium-emphasis ml-2">
            ({{ entity.player_name }})
          </span>
        </template>
        <v-spacer />
        <SharedPinButton :entity-id="entityId" variant="icon" size="small" />
      </v-card-title>

      <v-card-text style="max-height: 65vh">
        <SharedEntityPreviewBody
          ref="bodyRef"
          :entity-type="normalizedEntityType"
          :entity-id="entityId"
          @loaded="entity = $event"
          @open="openAsTab"
        />
      </v-card-text>

      <v-card-actions class="flex-wrap">
        <v-btn variant="text" prepend-icon="mdi-open-in-new" :disabled="!entity" @click="goToPage">
          {{ $t('sessions.goToPage') }}
        </v-btn>
        <v-btn v-if="fullDialog" variant="tonal" color="primary" prepend-icon="mdi-pencil" @click="fullOpen = true">
          {{ $t('preview.openFull') }}
        </v-btn>
        <v-btn variant="text" prepend-icon="mdi-tab-plus" :disabled="!entity" @click="openAsTab(normalizedEntityType, entityId, entity?.name ?? '')">
          {{ $t('entityTabs.openAsTab') }}
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
    @saved="bodyRef?.reload()"
  />
</template>

<script setup lang="ts">
import { isShopLocationType } from '~~/types/shop'
import { ENTITY_FULL_DIALOGS, ENTITY_PREVIEW_CONFIG, entityPageLink } from '~/utils/entityPreview'
import type { PreviewEntity } from './EntityPreviewBody.vue'

export type EntityPreviewType = 'npc' | 'location' | 'item' | 'faction' | 'lore' | 'player' | 'quest'

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
const entityTabs = useEntityTabsStore()
const { getItemTypeIcon, getLocationTypeIcon } = useEntityIcons()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const entity = ref<PreviewEntity | null>(null)
const bodyRef = ref<{ reload: () => Promise<void> } | null>(null)

const normalizedEntityType = computed(() => props.entityType.toLowerCase() as EntityPreviewType)
const entityMetaType = computed(() => (entity.value?.metadata as { type?: string } | null)?.type)
const isShop = computed(() => normalizedEntityType.value === 'location' && isShopLocationType(entityMetaType.value ?? (entity.value as { type?: string } | null)?.type))

const fullDialog = computed(() => (props.entityId ? ENTITY_FULL_DIALOGS[normalizedEntityType.value] ?? null : null))
const fullOpen = ref(false)
watch(() => props.entityId, () => {
  entity.value = null
})

const entityIcon = computed(() => {
  if (normalizedEntityType.value === 'item' && entity.value) return getItemTypeIcon(entityMetaType.value)
  if (normalizedEntityType.value === 'location' && entity.value) return getLocationTypeIcon(entityMetaType.value)
  return ENTITY_PREVIEW_CONFIG[normalizedEntityType.value]?.icon || 'mdi-help'
})
const entityColor = computed(() => ENTITY_PREVIEW_CONFIG[normalizedEntityType.value]?.color || 'grey')

function openAsTab(type: EntityPreviewType, id: number | null, name: string) {
  if (!id) return
  entityTabs.open(type, id, name)
  close()
}

function goToPage() {
  if (!entity.value || !props.entityId) return
  router.push(entityPageLink(normalizedEntityType.value, props.entityId, entity.value.name))
  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>
