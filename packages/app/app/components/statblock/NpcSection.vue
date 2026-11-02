<template>
  <div>
    <div class="d-flex align-center mb-2">
      <v-icon size="small" class="mr-1">mdi-sword-cross</v-icon>
      <span class="text-title-small font-weight-bold">{{ $t('statblock.title') }}</span>
      <v-spacer />
      <v-btn v-if="block" size="x-small" variant="text" prepend-icon="mdi-pencil" @click="openEditor(block)">{{ $t('common.edit') }}</v-btn>
    </div>

    <StatblockView v-if="block" :block="block" compact />
    <div v-else class="d-flex flex-wrap ga-2">
      <v-btn v-if="found" size="small" color="primary" variant="tonal" prepend-icon="mdi-auto-fix" @click="openEditor(found.block, true)">{{ $t('statblock.fromNotes') }}</v-btn>
      <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="openEditor({ traits: [], actions: [] })">{{ $t('statblock.add') }}</v-btn>
    </div>

    <v-dialog v-model="editorOpen" max-width="900" scrollable>
      <v-card>
        <v-card-title>{{ $t('statblock.title') }} · {{ name }}</v-card-title>
        <v-card-text style="max-height: 78vh">
          <v-alert v-if="fromNotes" type="info" variant="tonal" density="compact" class="mb-3">{{ $t('statblock.fromNotesHint') }}</v-alert>
          <StatblockEditor v-model="draft" />
        </v-card-text>
        <v-card-actions>
          <v-checkbox v-if="fromNotes" v-model="trimNotes" :label="$t('statblock.trimNotes')" density="compact" hide-details class="ml-2" />
          <v-btn v-if="block && !fromNotes" variant="text" color="error" @click="removeBlock">{{ $t('statblock.remove') }}</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="editorOpen = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="save">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { StatBlock } from '~~/types/statblock'

/** An NPC's stat block in the side panel — or a one-click "read it from the notes". */
const props = defineProps<{ entityId: number, name: string }>()
const emit = defineEmits<{ notesChanged: [] }>()
const block = ref<StatBlock | null>(null)
const found = ref<{ block: StatBlock, rest: string } | null>(null)
const editorOpen = ref(false)
const fromNotes = ref(false)
const trimNotes = ref(true)
const saving = ref(false)
const draft = ref<StatBlock>({})

async function load() {
  block.value = (await $fetch<{ block: StatBlock | null }>(`/api/monsters/npc/${props.entityId}`).catch(() => ({ block: null }))).block
  found.value = block.value ? null : await $fetch<{ block: StatBlock, rest: string } | null>(`/api/monsters/npc/${props.entityId}/convert`, { method: 'POST', body: {} }).catch(() => null)
}
watch(() => props.entityId, load, { immediate: true })

function openEditor(b: StatBlock, notes = false) {
  draft.value = JSON.parse(JSON.stringify(b)) as StatBlock
  fromNotes.value = notes
  editorOpen.value = true
}
async function save() {
  saving.value = true
  try {
    if (fromNotes.value) {
      await $fetch(`/api/monsters/npc/${props.entityId}/convert`, { method: 'POST', body: { apply: true, block: draft.value, trimNotes: trimNotes.value } })
      if (trimNotes.value) emit('notesChanged')
    }
    else {
      await $fetch(`/api/monsters/npc/${props.entityId}`, { method: 'PUT', body: { block: draft.value } })
    }
    editorOpen.value = false
    await load()
  }
  finally {
    saving.value = false
  }
}
async function removeBlock() {
  await $fetch(`/api/monsters/npc/${props.entityId}`, { method: 'PUT', body: { block: null } })
  editorOpen.value = false
  await load()
}
</script>
