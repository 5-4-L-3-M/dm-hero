<template>
  <v-dialog :model-value="modelValue" max-width="620" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center"><v-icon class="mr-2">mdi-archive-outline</v-icon>{{ $t('story.archive.title') }}</v-card-title>
      <v-card-subtitle class="text-wrap">{{ $t('story.archive.hint') }}</v-card-subtitle>
      <v-card-text>
        <div v-if="!count" class="text-medium-emphasis py-6 text-center">{{ $t('story.archive.empty') }}</div>

        <template v-for="group in groups" :key="group.key">
          <div v-if="group.items.length" class="text-body-small font-weight-bold text-uppercase text-medium-emphasis mt-3 mb-1">{{ $t(`story.archive.${group.key}`) }}</div>
          <div v-for="it in group.items" :key="`${group.key}-${it.id}`" class="d-flex align-center archive-row">
            <v-icon size="small" class="mr-2">{{ group.icon }}</v-icon>
            <div class="flex-grow-1 min-w-0">
              <div class="text-truncate">{{ it.title }}</div>
              <div v-if="it.sub" class="text-body-small text-medium-emphasis text-truncate">{{ it.sub }}</div>
            </div>
            <v-btn size="small" variant="tonal" prepend-icon="mdi-restore" @click="restore(group.key, it.id)">{{ $t('story.archive.restore') }}</v-btn>
          </div>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
/** Everything put away: clusters, beats / sparks, quests — restore with one click. Nothing lands here on its own. */
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
const { t } = useI18n()
const store = useStoryBoardStore()

const groups = computed(() => [
  { key: 'clusters', icon: 'mdi-vector-square', items: store.archivedClusters.map(c => ({ id: c.id, title: c.title, sub: t('story.archive.beatCount', { n: (store.board?.beats ?? []).filter(b => b.cluster_id === c.id).length }) })) },
  { key: 'beats', icon: 'mdi-lightbulb-outline', items: store.archivedBeats.map(b => ({ id: b.id, title: b.title, sub: store.board?.clusters.find(c => c.id === b.cluster_id)?.title ?? t('story.sparks.title') })) },
  { key: 'quests', icon: 'mdi-script-text', items: store.quests.filter(q => q.archived).map(q => ({ id: q.id, title: q.name, sub: t(`quests.statuses.${q.status}`) })) },
])
const count = computed(() => groups.value.reduce((n, g) => n + g.items.length, 0))

async function restore(kind: string, id: number) {
  if (kind === 'clusters') await store.updateCluster(id, { archived: false })
  else if (kind === 'beats') await store.updateBeat(id, { archived: false })
  else await store.setQuestArchived(id, false)
}
</script>

<style scoped>
.archive-row {
  padding: 6px 8px;
  border-radius: 8px;
}
.archive-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
}
.min-w-0 {
  min-width: 0;
}
</style>
