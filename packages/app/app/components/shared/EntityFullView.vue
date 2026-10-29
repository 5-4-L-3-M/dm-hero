<template>
  <v-dialog :model-value="modelValue" max-width="1000" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card v-if="entityId">
      <div class="d-flex align-center px-5 pt-4 pb-2">
        <v-icon :icon="config.icon" :color="config.color" class="mr-2" />
        <div class="text-headline-small font-weight-medium text-truncate flex-grow-1">{{ name }}</div>
        <v-btn icon="mdi-close" variant="text" :aria-label="$t('common.close')" @click="$emit('update:modelValue', false)" />
      </div>
      <div class="d-flex flex-wrap ga-2 px-5 pb-3">
        <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-pencil" @click="editOpen = true">{{ $t('preview.edit') }}</v-btn>
        <v-btn size="small" variant="text" prepend-icon="mdi-tab-plus" @click="openAsTab">{{ $t('entityTabs.openAsTab') }}</v-btn>
        <v-btn size="small" variant="text" prepend-icon="mdi-open-in-new" @click="goToPage">{{ $t('sessions.goToPage') }}</v-btn>
      </div>
      <v-divider />
      <v-card-text class="full-view__body">
        <SharedEntityPreviewBody
          ref="bodyRef"
          :entity-type="entityType"
          :entity-id="entityId"
          @loaded="e => (name = e?.name ?? name)"
          @open="(t, id, n) => tabs.open(t, id, n)"
        />
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- The editor, only when asked for -->
  <component
    :is="ENTITY_FULL_DIALOGS[entityType].component"
    v-if="entityId && editOpen"
    v-model:show="editOpen"
    v-bind="{ [ENTITY_FULL_DIALOGS[entityType].idProp]: entityId }"
    @saved="bodyRef?.reload()"
  />
</template>

<script setup lang="ts">
import { ENTITY_FULL_DIALOGS, ENTITY_PREVIEW_CONFIG, entityPageLink } from '~/utils/entityPreview'
import type { EntityPreviewType } from './EntityPreviewDialog.vue'

/** Read-only full page of an entry (every section, roomy); "Edit" opens the editor on top. */
const props = defineProps<{ modelValue: boolean, entityType: EntityPreviewType, entityId: number | null, entityName?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const tabs = useEntityTabsStore()
const router = useRouter()
const config = computed(() => ENTITY_PREVIEW_CONFIG[props.entityType])
const name = ref(props.entityName ?? '')
const editOpen = ref(false)
const bodyRef = ref<{ reload: () => Promise<void> } | null>(null)

watch(() => props.entityId, () => {
  name.value = props.entityName ?? ''
  editOpen.value = false
})

function openAsTab() {
  if (!props.entityId) return
  tabs.open(props.entityType, props.entityId, name.value)
  emit('update:modelValue', false)
}
function goToPage() {
  if (!props.entityId) return
  emit('update:modelValue', false)
  router.push(entityPageLink(props.entityType, props.entityId, name.value))
}
</script>

<style scoped>
.full-view__body {
  max-height: 75vh;
}
</style>
