<template>
  <v-dialog :model-value="modelValue" v-bind="dockAttrs" scrollable @click:outside="dockOutside" @update:model-value="v => dockAccept(v) && $emit('update:modelValue', v)">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-timeline-outline</v-icon>
        {{ questline ? $t('story.questline.edit') : $t('story.questline.new') }}
      </v-card-title>
      <v-card-text>
        <v-text-field v-model="form.name" :label="$t('story.questline.name')" variant="outlined" density="comfortable" autofocus class="mb-3" />
        <v-select
          v-model="form.storyline_id"
          :items="store.storylines.map(s => ({ title: s.name, value: s.id }))"
          :label="$t('story.storyline.label')"
          variant="outlined"
          density="comfortable"
          clearable
          class="mb-3"
        />
        <div class="text-body-small text-medium-emphasis mb-1">{{ $t('quests.importance') }}</div>
        <v-btn-toggle v-model="form.importance" mandatory density="comfortable" variant="outlined" divided class="mb-3">
          <v-btn value="major" size="small"><v-icon start>mdi-star</v-icon>{{ $t('quests.major') }}</v-btn>
          <v-btn value="minor" size="small"><v-icon start>mdi-star-outline</v-icon>{{ $t('quests.minor') }}</v-btn>
        </v-btn-toggle>
        <v-checkbox v-model="form.optional" :label="$t('story.questline.optional')" :hint="$t('story.questline.defaultsHint')" persistent-hint density="compact" class="mb-3" />
        <v-textarea v-model="form.notes" :label="$t('story.cluster.notes')" variant="outlined" rows="2" auto-grow />
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="questline" color="error" variant="text" prepend-icon="mdi-delete" :title="$t('story.questline.deleteHint')" @click="remove">{{ $t('common.delete') }}</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!form.name.trim()" :loading="saving" @click="save">{{ $t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { QuestImportance, Questline } from '~~/types/story'

/** Create or edit a questline: a chain of quests in order (one Timeline row). */
const props = defineProps<{ modelValue: boolean, questline: Questline | null, defaultStorylineId?: number | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const store = useStoryBoardStore()
const { dockAttrs, dockOutside, dockAccept } = useDockedDialog(560)

interface Form { name: string, storyline_id: number | null, importance: QuestImportance, optional: boolean, notes: string }
const form = ref<Form>({ name: '', storyline_id: null, importance: 'major', optional: false, notes: '' })
const saving = ref(false)

watch(() => props.modelValue, (open) => {
  if (!open) return
  const q = props.questline
  form.value = q
    ? { name: q.name, storyline_id: q.storyline_id, importance: q.importance, optional: q.optional, notes: q.notes ?? '' }
    : { name: '', storyline_id: props.defaultStorylineId ?? null, importance: 'major', optional: false, notes: '' }
}, { immediate: true })

async function save() {
  saving.value = true
  try {
    const data = { ...form.value, notes: form.value.notes || null }
    if (props.questline) await store.updateQuestline(props.questline.id, data)
    else await store.addQuestline(data)
    emit('update:modelValue', false)
  }
  finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.questline) return
  await store.deleteQuestline(props.questline.id)
  emit('update:modelValue', false)
}
</script>
