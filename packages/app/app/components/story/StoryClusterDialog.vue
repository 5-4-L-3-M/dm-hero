<template>
  <v-dialog :model-value="modelValue" max-width="620" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>{{ cluster ? $t('story.cluster.edit') : $t('story.cluster.new') }}</v-card-title>
      <v-card-text>
        <v-text-field v-model="form.title" :label="$t('story.cluster.title')" variant="outlined" density="comfortable" autofocus class="mb-3" />

        <v-select
          v-model="form.storyline_id"
          :items="storylineOptions"
          :label="$t('story.storyline.label')"
          variant="outlined"
          density="comfortable"
          clearable
          class="mb-3"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps">
              <template #prepend>
                <span class="swatch mr-3" :style="{ background: `rgb(var(--v-theme-story-${item.color}))` }" />
              </template>
            </v-list-item>
          </template>
        </v-select>

        <div class="text-body-small text-medium-emphasis mb-1">{{ $t('story.cluster.heat') }}</div>
        <v-btn-toggle v-model="form.heat" mandatory density="comfortable" variant="outlined" divided class="mb-3">
          <v-btn v-for="h in CLUSTER_HEATS" :key="h" :value="h" size="small" :color="heatColor(h)">{{ $t(`story.heat.${h}`) }}</v-btn>
        </v-btn-toggle>

        <div class="text-body-small text-medium-emphasis mb-1">{{ $t('story.cluster.status') }}</div>
        <v-btn-toggle v-model="form.status" mandatory density="comfortable" variant="outlined" divided class="mb-4">
          <v-btn v-for="s in CLUSTER_STATUSES" :key="s" :value="s" size="small">{{ $t(`story.clusterStatus.${s}`) }}</v-btn>
        </v-btn-toggle>

        <v-autocomplete
          v-model="form.location_id"
          :items="store.locations"
          item-title="name"
          item-value="id"
          :label="$t('story.cluster.location')"
          :hint="$t('story.cluster.locationHint')"
          persistent-hint
          prepend-inner-icon="mdi-map-marker"
          variant="outlined"
          density="comfortable"
          clearable
          class="mb-3"
        />
        <v-autocomplete
          v-model="form.quest_id"
          :items="store.quests"
          item-title="name"
          item-value="id"
          :label="$t('story.cluster.quest')"
          prepend-inner-icon="mdi-script-text"
          variant="outlined"
          density="comfortable"
          clearable
          class="mb-3"
        />
        <v-textarea v-model="form.notes" :label="$t('story.cluster.notes')" variant="outlined" rows="2" auto-grow />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!form.title.trim()" :loading="saving" @click="save">{{ $t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { CLUSTER_HEATS, CLUSTER_STATUSES, heatColor, type ClusterHeat, type ClusterStatus, type StoryCluster } from '~~/types/story'

/** Create or edit a cluster: its storyline (= color), heat, status, place and quest. */
const props = defineProps<{ modelValue: boolean, cluster: StoryCluster | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const store = useStoryBoardStore()

interface Form { title: string, storyline_id: number | null, heat: ClusterHeat, status: ClusterStatus, location_id: number | null, quest_id: number | null, notes: string }
const form = ref<Form>({ title: '', storyline_id: null, heat: 'warm', status: 'active', location_id: null, quest_id: null, notes: '' })
const saving = ref(false)

watch(() => props.modelValue, (open) => {
  if (!open) return
  const c = props.cluster
  form.value = c
    ? { title: c.title, storyline_id: c.storyline_id, heat: c.heat, status: c.status, location_id: c.location_id, quest_id: c.quest_id, notes: c.notes ?? '' }
    : { title: '', storyline_id: store.storylines[0]?.id ?? null, heat: 'warm', status: 'active', location_id: null, quest_id: null, notes: '' }
}, { immediate: true })

const storylineOptions = computed(() => store.storylines.map(s => ({ title: s.name, value: s.id, color: s.color })))

async function save() {
  saving.value = true
  try {
    const data = { ...form.value, notes: form.value.notes || null }
    if (props.cluster) await store.updateCluster(props.cluster.id, data)
    else await store.addCluster(data)
    emit('update:modelValue', false)
  }
  finally {
    saving.value = false
  }
}
</script>

<style scoped>
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}
</style>
