<template>
  <!-- The less-used row actions, tucked into one ⋮ menu so rows stay readable -->
  <v-menu location="bottom end">
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        icon="mdi-dots-vertical"
        :size="size"
        variant="text"
        :aria-label="$t('common.actions')"
        @click.stop
      />
    </template>
    <v-list density="compact" min-width="200">
      <v-list-item prepend-icon="mdi-pencil" :title="$t('common.edit')" @click="$emit('edit', location)" />
      <v-list-item
        v-if="gameTable.table"
        :prepend-icon="shared ? 'mdi-share-variant' : 'mdi-share-variant-outline'"
        :title="shared ? $t('gameTable.share.shared') : $t('gameTable.share.action')"
        :base-color="shared ? 'primary' : undefined"
        @click="gameTable.openShareDialog('location', location.id, location.name)"
      />
      <v-list-item prepend-icon="mdi-graph" :title="$t('chaos.title')" @click="$emit('graph', location)" />
      <v-list-item
        :prepend-icon="location.archived_at ? 'mdi-package-up' : 'mdi-archive-arrow-down'"
        :title="location.archived_at ? $t('common.unarchive') : $t('common.archive')"
        @click="$emit('archive', location)"
      />
      <v-divider class="my-1" />
      <v-list-item prepend-icon="mdi-delete" base-color="error" :title="$t('common.delete')" @click="$emit('delete', location)" />
    </v-list>
  </v-menu>
</template>

<script setup lang="ts" generic="T extends { id: number, name: string, archived_at?: string | null }">
const props = withDefaults(defineProps<{ location: T, size?: string }>(), { size: 'small' })

defineEmits<{
  edit: [location: T]
  graph: [location: T]
  archive: [location: T]
  delete: [location: T]
}>()

const gameTable = useGameTableStore()
const shared = computed(() => !!gameTable.shareOf('location', props.location.id))
</script>
