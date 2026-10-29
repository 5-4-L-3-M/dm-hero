<template>
  <v-list-item v-if="text" :disabled="busy" class="text-primary" @click="create">
    <template #prepend>
      <v-progress-circular v-if="busy" indeterminate size="18" width="2" class="mr-4" />
      <v-icon v-else>mdi-plus-circle</v-icon>
    </template>
    <v-list-item-title>{{ $t('quickCreate.createNamed', { name: text, type: typeLabel }) }}</v-list-item-title>
  </v-list-item>
  <v-list-item v-else :title="$t('common.noResults')" />
</template>

<script setup lang="ts">
import type { QuickCreateType } from '~/composables/useQuickCreate'

/**
 * Put in a picker's #no-data slot: when what was typed matches nothing,
 * offer "Create "…" as new <type>" — one click makes the page and hands it back.
 * kind "races"/"classes" creates a Reference Data entry instead and emits its key.
 */
const props = defineProps<{ search: string | null | undefined, type: QuickCreateType | 'races' | 'classes' }>()
const emit = defineEmits<{ created: [entity: { id: number, name: string, type: string, key?: string }] }>()

const { t } = useI18n()
const { createEntity, createReference } = useQuickCreate()
const busy = ref(false)
const text = computed(() => (props.search ?? '').trim())

const TYPE_LABELS: Record<string, string> = {
  NPC: 'entities.types.npc',
  Location: 'entities.types.location',
  Item: 'entities.types.item',
  Faction: 'entities.types.faction',
  Lore: 'entities.types.lore',
  races: 'npcs.race',
  classes: 'npcs.class',
}
const typeLabel = computed(() => (TYPE_LABELS[props.type] ? t(TYPE_LABELS[props.type]!) : props.type))

async function create() {
  if (!text.value || busy.value) return
  busy.value = true
  try {
    if (props.type === 'races' || props.type === 'classes') {
      const key = await createReference(props.type, text.value)
      emit('created', { id: 0, name: text.value, type: props.type, key })
    }
    else {
      emit('created', await createEntity(props.type, text.value))
    }
  }
  finally {
    busy.value = false
  }
}
</script>
