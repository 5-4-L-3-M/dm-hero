<template>
  <v-dialog :model-value="modelValue" max-width="720" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">{{ BEAT_KIND_ICONS[form.kind] }}</v-icon>
        {{ beat ? $t('story.beat.edit') : $t('story.beat.new') }}
      </v-card-title>
      <v-card-text>
        <v-text-field v-model="form.title" :label="$t('story.beat.title')" variant="outlined" density="comfortable" autofocus class="mb-3" />

        <div class="text-body-small text-medium-emphasis mb-1">{{ $t('story.beat.kind') }}</div>
        <v-btn-toggle v-model="form.kind" mandatory density="comfortable" variant="outlined" divided class="mb-3 flex-wrap">
          <v-btn v-for="k in BEAT_KINDS" :key="k" :value="k" size="small">
            <v-icon start>{{ BEAT_KIND_ICONS[k] }}</v-icon>{{ $t(`story.kind.${k}`) }}
          </v-btn>
        </v-btn-toggle>

        <div class="text-body-small text-medium-emphasis mb-1">{{ $t('story.beat.status') }}</div>
        <v-btn-toggle v-model="form.status" mandatory density="comfortable" variant="outlined" divided class="mb-4">
          <v-btn v-for="s in BEAT_STATUSES" :key="s" :value="s" size="small">{{ $t(`story.beatStatus.${s}`) }}</v-btn>
        </v-btn-toggle>

        <v-textarea
          v-model="form.body"
          :label="$t('story.beat.body')"
          :hint="$t('story.beat.bodyHint')"
          persistent-hint
          variant="outlined"
          rows="5"
          auto-grow
          class="mb-4"
        />

        <v-row dense>
          <v-col cols="12" sm="6">
            <v-select
              v-model="form.cluster_id"
              :items="clusterOptions"
              :label="$t('story.beat.cluster')"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-autocomplete
              v-model:search="quickLocationSearch"
              v-model="form.location_id"
              :items="store.locations"
              item-title="name"
              item-value="id"
              :label="$t('story.beat.location')"
              prepend-inner-icon="mdi-map-marker"
              variant="outlined"
              density="comfortable"
              clearable
              hide-details
            >
              <template #no-data>
                <SharedCreateFromSearch :search="quickLocationSearch" type="Location" @created="quickLocationCreated" />
              </template>
            </v-autocomplete>
          </v-col>
          <v-col cols="12">
            <v-autocomplete
              v-model:search="quickEntitiesSearch"
              v-model="form.entity_ids"
              :items="linkable"
              item-title="name"
              item-value="id"
              :label="$t('story.beat.entities')"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="comfortable"
              hide-details
            >
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps" :prepend-icon="iconFor(item.type)" :subtitle="item.type" />
              </template>
              <template #no-data>
                <SharedCreateFromSearch :search="quickEntitiesSearch" type="NPC" @created="quickEntitiesCreated" />
              </template>
            </v-autocomplete>
          </v-col>
          <v-col cols="12" sm="6">
            <v-checkbox v-model="form.in_tray" :label="$t('story.tray.inTray')" density="comfortable" hide-details />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="form.played_session_id"
              :items="sessionOptions"
              :label="$t('story.beat.playedIn')"
              variant="outlined"
              density="comfortable"
              clearable
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="beat" color="error" variant="text" prepend-icon="mdi-delete" @click="remove">{{ $t('common.delete') }}</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!form.title.trim()" :loading="saving" @click="save">{{ $t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { BEAT_KINDS, BEAT_KIND_ICONS, BEAT_STATUSES, type BeatKind, type BeatStatus, type StoryBeat } from '~~/types/story'
import { ENTITY_PREVIEW_CONFIG } from '~/utils/entityPreview'
import { toPreviewType } from '~/stores/entityTabs'

/** Create or edit a beat: what happens, who/what is involved, where it sits. */
const props = defineProps<{ modelValue: boolean, beat: StoryBeat | null, defaultClusterId?: number | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { t } = useI18n()
const store = useStoryBoardStore()

interface Form {
  title: string
  body: string
  kind: BeatKind
  status: BeatStatus
  cluster_id: number | null
  location_id: number | null
  entity_ids: number[]
  in_tray: boolean
  played_session_id: number | null
}
const empty = (): Form => ({ title: '', body: '', kind: 'scene', status: 'idea', cluster_id: props.defaultClusterId ?? null, location_id: null, entity_ids: [], in_tray: false, played_session_id: null })
const form = ref<Form>(empty())
const saving = ref(false)
const sessions = ref<{ id: number, session_number: number | null, title: string }[]>([])

watch(() => props.modelValue, async (open) => {
  if (!open) return
  const b = props.beat
  form.value = b
    ? { title: b.title, body: b.body ?? '', kind: b.kind, status: b.status, cluster_id: b.cluster_id, location_id: b.location_id, entity_ids: b.entities.map(e => e.id), in_tray: b.tray_order !== null, played_session_id: b.played_session_id }
    : empty()
  if (store.campaignId) {
    sessions.value = await $fetch<typeof sessions.value>('/api/sessions', { query: { campaignId: store.campaignId } }).catch(() => [])
  }
}, { immediate: true })

const clusterOptions = computed(() => [
  { title: t('story.sparks.title'), value: null },
  ...store.clusters.map(c => ({ title: c.title, value: c.id })),
])
const sessionOptions = computed(() => sessions.value.map(s => ({ title: s.session_number ? `#${s.session_number} ${s.title}` : s.title, value: s.id })))
const linkable = computed(() => store.entities)

function iconFor(type: string) {
  const p = toPreviewType(type)
  return p ? ENTITY_PREVIEW_CONFIG[p].icon : 'mdi-link'
}

async function save() {
  saving.value = true
  try {
    const data = { ...form.value, body: form.value.body || null }
    if (props.beat) await store.updateBeat(props.beat.id, data)
    else await store.addBeat(data)
    emit('update:modelValue', false)
  }
  finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.beat) return
  await store.deleteBeat(props.beat.id)
  emit('update:modelValue', false)
}

// Typed a name that matches nothing → create it right from the list
const quickLocationSearch = ref('')
function quickLocationCreated(e: { id: number, name: string }) {
  form.value.location_id = e.id
}

// Typed a name that matches nothing → create it right from the list
const quickEntitiesSearch = ref('')
function quickEntitiesCreated(e: { id: number, name: string }) {
  form.value.entity_ids.push(e.id)
}
</script>
