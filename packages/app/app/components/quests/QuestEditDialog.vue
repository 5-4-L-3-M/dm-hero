<template>
  <v-dialog :model-value="show" max-width="720" scrollable @update:model-value="$emit('update:show', $event)">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" color="brown">mdi-script-text</v-icon>
        {{ questId ? $t('quests.edit') : $t('quests.new') }}
      </v-card-title>
      <v-card-text>
        <v-progress-linear v-if="loading" indeterminate class="mb-3" />
        <v-text-field v-model="form.name" :label="$t('quests.name')" variant="outlined" density="comfortable" autofocus class="mb-3" />

        <div class="text-body-small text-medium-emphasis mb-1">{{ $t('quests.status') }}</div>
        <v-btn-toggle v-model="form.status" mandatory density="comfortable" variant="outlined" divided class="mb-4 flex-wrap">
          <v-btn v-for="s in QUEST_STATUSES" :key="s" :value="s" size="small">
            <v-icon start>{{ QUEST_STATUS_ICONS[s] }}</v-icon>{{ $t(`quests.statuses.${s}`) }}
          </v-btn>
        </v-btn-toggle>

        <v-row dense>
          <v-col cols="12" sm="6">
            <v-autocomplete
              v-model="form.giver_id"
              :items="givers"
              item-title="name"
              item-value="id"
              :label="$t('quests.giver')"
              prepend-inner-icon="mdi-account-voice"
              variant="outlined"
              density="comfortable"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-autocomplete
              v-model="form.location_id"
              :items="store.locations"
              item-title="name"
              item-value="id"
              :label="$t('quests.location')"
              prepend-inner-icon="mdi-map-marker"
              variant="outlined"
              density="comfortable"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="form.storyline_id"
              :items="store.storylines.map(s => ({ title: s.name, value: s.id }))"
              :label="$t('story.storyline.label')"
              variant="outlined"
              density="comfortable"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="form.reward" :label="$t('quests.reward')" prepend-inner-icon="mdi-treasure-chest" variant="outlined" density="comfortable" />
          </v-col>
        </v-row>

        <v-autocomplete
          v-model="form.involved_ids"
          :items="involvable"
          item-title="name"
          item-value="id"
          :label="$t('quests.involved')"
          prepend-inner-icon="mdi-account-multiple"
          multiple
          chips
          closable-chips
          variant="outlined"
          density="comfortable"
          class="mb-2"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :prepend-icon="iconFor(item.type)" :subtitle="item.type" />
          </template>
        </v-autocomplete>

        <v-textarea
          v-model="form.description"
          :label="$t('quests.description')"
          :hint="$t('story.beat.bodyHint')"
          persistent-hint
          variant="outlined"
          rows="4"
          auto-grow
          class="mb-4"
        />

        <div class="text-body-small text-medium-emphasis mb-1">{{ $t('quests.objectives') }}</div>
        <div v-for="(o, i) in form.objectives" :key="i" class="d-flex align-center ga-1">
          <v-checkbox-btn v-model="o.done" density="compact" class="flex-grow-0" />
          <v-text-field v-model="o.text" variant="underlined" density="compact" hide-details class="flex-grow-1" />
          <v-btn icon="mdi-close" variant="text" size="small" :aria-label="$t('common.delete')" @click="form.objectives.splice(i, 1)" />
        </div>
        <v-text-field
          v-model="newObjective"
          :placeholder="$t('quests.addObjective')"
          prepend-inner-icon="mdi-plus"
          variant="plain"
          density="compact"
          hide-details
          @keyup.enter="addObjective"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="questId" color="error" variant="text" prepend-icon="mdi-delete" @click="remove">{{ $t('common.delete') }}</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:show', false)">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!form.name.trim()" :loading="saving" @click="save">{{ $t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { QUEST_STATUSES, QUEST_STATUS_ICONS, type Quest, type QuestObjective, type QuestStatus } from '~~/types/story'
import { ENTITY_PREVIEW_CONFIG } from '~/utils/entityPreview'
import { toPreviewType } from '~/stores/entityTabs'

/** Create or edit a quest: status, who gave it, where, who's involved, reward and objectives. */
const props = defineProps<{ show: boolean, questId?: number | null, initialStatus?: QuestStatus }>()
const emit = defineEmits<{ 'update:show': [value: boolean], 'saved': [quest: Quest], 'deleted': [id: number] }>()

const store = useStoryBoardStore()
const campaignStore = useCampaignStore()

interface Form { name: string, description: string, status: QuestStatus, giver_id: number | null, location_id: number | null, storyline_id: number | null, reward: string, objectives: QuestObjective[], involved_ids: number[] }
const blank = (): Form => ({ name: '', description: '', status: props.initialStatus ?? 'rumor', giver_id: null, location_id: null, storyline_id: null, reward: '', objectives: [], involved_ids: [] })
const form = ref<Form>(blank())
const loading = ref(false)
const saving = ref(false)
const newObjective = ref('')

const givers = computed(() => store.entities.filter(e => ['NPC', 'Faction', 'Player'].includes(e.type)))
const involvable = computed(() => store.entities.filter(e => e.id !== props.questId))
function iconFor(type: string) {
  const p = toPreviewType(type)
  return p ? ENTITY_PREVIEW_CONFIG[p].icon : 'mdi-link'
}

watch(() => props.show, async (open) => {
  if (!open) return
  form.value = blank()
  newObjective.value = ''
  loading.value = true
  try {
    await store.load(campaignStore.activeCampaignIdNumber)
    if (props.questId) {
      const q = await $fetch<Quest>(`/api/quests/${props.questId}`)
      form.value = { name: q.name, description: q.description ?? '', status: q.status, giver_id: q.giver_id, location_id: q.location_id, storyline_id: q.storyline_id, reward: q.reward ?? '', objectives: q.objectives.map(o => ({ ...o })), involved_ids: (q.involved ?? []).map(e => e.id) }
    }
  }
  finally {
    loading.value = false
  }
}, { immediate: true })

function addObjective() {
  const text = newObjective.value.trim()
  if (!text) return
  form.value.objectives.push({ text, done: false })
  newObjective.value = ''
}

async function save() {
  addObjective()
  saving.value = true
  try {
    const quest = await store.saveQuest(props.questId ?? null, { ...form.value, description: form.value.description || null, reward: form.value.reward || null })
    emit('saved', quest)
    emit('update:show', false)
  }
  finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.questId) return
  await store.deleteQuest(props.questId)
  emit('deleted', props.questId)
  emit('update:show', false)
}
</script>
