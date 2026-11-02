<template>
  <div v-if="tables.length || allowAdd">
    <div class="d-flex align-center mb-2">
      <v-icon size="small" class="mr-1">mdi-dice-multiple</v-icon>
      <span class="text-title-small font-weight-bold">{{ $t('rollTables.title') }}</span>
      <v-spacer />
      <v-btn v-if="allowAdd" size="x-small" variant="text" prepend-icon="mdi-plus" @click="editorOpen = true">{{ $t('rollTables.new') }}</v-btn>
    </div>
    <div class="d-flex flex-column ga-2">
      <RollTablesCard v-for="tb in tables" :key="tb.id" :table="tb" compact />
    </div>
    <div v-if="!tables.length" class="text-body-small text-medium-emphasis">{{ $t('rollTables.noneTagged') }}</div>
    <RollTablesEditor v-model="editorOpen" :categories="[]" :preset-tags="[tagKey]" @saved="load" />
  </div>
</template>

<script setup lang="ts">
import type { RollTable } from '~~/types/rollTable'

/** The roll tables tagged to one quest / place / NPC / session. */
const props = defineProps<{ entityId?: number | null, sessionId?: number | null, allowAdd?: boolean }>()
const campaign = useCampaignStore()
const tables = ref<RollTable[]>([])
const editorOpen = ref(false)
const tagKey = computed(() => (props.sessionId ? `session:${props.sessionId}` : `entity:${props.entityId}`))

async function load() {
  if (!campaign.activeCampaignIdNumber || (!props.entityId && !props.sessionId)) return
  tables.value = await $fetch<RollTable[]>('/api/roll-tables', {
    query: { campaignId: campaign.activeCampaignIdNumber, entityId: props.entityId ?? undefined, sessionId: props.sessionId ?? undefined },
  }).catch(() => [])
}
watch(() => [props.entityId, props.sessionId], load, { immediate: true })
</script>
