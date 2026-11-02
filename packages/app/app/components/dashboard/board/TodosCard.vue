<template>
  <div class="d-flex flex-column h-100">
    <v-text-field
      v-model="text"
      :placeholder="$t('dashboardBoards.cards.todos.add')"
      prepend-inner-icon="mdi-plus"
      variant="outlined"
      density="compact"
      hide-details
      class="mb-2 flex-grow-0"
      @keyup.enter="add"
    />
    <div v-for="n in notes.pendingNotes" :key="n.id" class="todo d-flex align-start">
      <v-checkbox-btn :model-value="false" density="compact" @update:model-value="notes.toggleCompleted(n.id)" />
      <span class="text-body-medium pt-2 flex-grow-1">{{ n.content }}</span>
    </div>
    <div v-if="!notes.pendingNotes.length" class="text-body-medium text-medium-emphasis">{{ $t('dashboard.notes.allDone') }}</div>
    <div v-if="notes.completedCount" class="d-flex align-center mt-2">
      <span class="text-body-small text-medium-emphasis">{{ $t('dashboardBoards.cards.todos.done', { count: notes.completedCount }) }}</span>
      <v-btn size="x-small" variant="text" to="/notes" class="ml-1">{{ $t('dashboardBoards.cards.todos.all') }}</v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
/** The campaign to-do list (the Notes page): tick things off, add new ones. */
const props = defineProps<{ campaignId: number }>()
const notes = useNotesStore()
const text = ref('')
watch(() => props.campaignId, id => notes.fetchNotes(id), { immediate: true })
async function add() {
  const v = text.value.trim()
  if (!v) return
  text.value = ''
  await notes.addNote(props.campaignId, v)
}
</script>

<style scoped>
.todo {
  white-space: pre-line;
}
</style>
