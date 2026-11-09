<template>
  <v-dialog :model-value="modelValue" v-bind="dockAttrs" scrollable @click:outside="dockOutside" @update:model-value="v => dockAccept(v) && $emit('update:modelValue', v)">
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
                <span class="swatch mr-3" :style="{ background: colorCss(storylineColor(item)) }" />
              </template>
            </v-list-item>
          </template>
        </v-select>

        <div class="text-body-small text-medium-emphasis mb-1">{{ $t('story.cluster.heat') }}</div>
        <div class="d-flex align-center flex-wrap ga-3 mb-3">
          <v-btn-toggle v-model="form.heat" mandatory density="comfortable" variant="outlined" divided>
            <v-btn v-for="h in CLUSTER_HEATS" :key="h" :value="h" size="small" :color="heatColor(h)">{{ $t(`story.heat.${h}`) }}</v-btn>
          </v-btn-toggle>
          <v-switch v-model="form.heat_pinned" :label="$t('story.drift.pin')" color="primary" density="compact" hide-details />
        </div>

        <div class="text-body-small text-medium-emphasis mb-1">{{ $t('story.cluster.status') }}</div>
        <v-btn-toggle v-model="form.status" mandatory density="comfortable" variant="outlined" divided class="mb-4">
          <v-btn v-for="s in CLUSTER_STATUSES" :key="s" :value="s" size="small">{{ $t(`story.clusterStatus.${s}`) }}</v-btn>
        </v-btn-toggle>

        <v-autocomplete
          v-model:search="quickLocationSearch"
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
        >
          <template #no-data>
            <SharedCreateFromSearch :search="quickLocationSearch" type="Location" @created="quickLocationCreated" />
          </template>
        </v-autocomplete>
        <v-autocomplete
          v-model="form.quest_id"
          :items="store.quests"
          item-title="name"
          item-value="id"
          :label="$t('story.cluster.quest')"
          :hint="$t('story.quest.linkHint')"
          persistent-hint
          prepend-inner-icon="mdi-script-text"
          variant="outlined"
          density="comfortable"
          clearable
          class="mb-3"
        />
        <!-- Optional progress clock (e.g. "Mirelle tells Cassian") -->
        <div class="d-flex align-center ga-2 mb-3">
          <v-select
            v-model="form.clock_size"
            :items="clockSizes"
            :label="$t('story.clock.size')"
            prepend-inner-icon="mdi-chart-donut"
            variant="outlined"
            density="comfortable"
            hide-details
            class="clock-size"
          />
          <v-text-field v-if="form.clock_size" v-model="form.clock_label" :label="$t('story.clock.label')" :placeholder="$t('story.clock.labelPlaceholder')" variant="outlined" density="comfortable" hide-details />
        </div>
        <v-autocomplete
          v-model:search="quickEntitiesSearch"
          v-model="form.entity_ids"
          :items="store.entities"
          item-title="name"
          item-value="id"
          :label="$t('story.cluster.involved')"
          :hint="$t('story.cluster.involvedHint')"
          persistent-hint
          prepend-inner-icon="mdi-account-multiple"
          multiple
          chips
          closable-chips
          variant="outlined"
          density="comfortable"
          class="mb-3"
          @update:model-value="quickEntitiesSearch = ''"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :subtitle="item.type" />
          </template>
          <template #no-data>
            <SharedCreateFromSearch :search="quickEntitiesSearch" type="NPC" @created="quickEntitiesCreated" />
          </template>
        </v-autocomplete>
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
import { CLUSTER_HEATS, CLUSTER_STATUSES, colorCss, heatColor, storylineColor, type ClusterHeat, type ClusterStatus, type StoryCluster } from '~~/types/story'

/** Create or edit a cluster: its storyline (= color), heat, status, place and quest. */
const props = defineProps<{ modelValue: boolean, cluster: StoryCluster | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const store = useStoryBoardStore()
const { dockAttrs, dockOutside, dockAccept } = useDockedDialog(620)

interface Form { title: string, storyline_id: number | null, heat: ClusterHeat, status: ClusterStatus, location_id: number | null, quest_id: number | null, notes: string, entity_ids: number[], heat_pinned: boolean, clock_size: number | null, clock_label: string }
const blank = (): Form => ({ title: '', storyline_id: store.storylines[0]?.id ?? null, heat: 'warm', status: 'active', location_id: null, quest_id: null, notes: '', entity_ids: [], heat_pinned: false, clock_size: null, clock_label: '' })
const form = ref<Form>(blank())
const saving = ref(false)

watch(() => props.modelValue, (open) => {
  if (!open) return
  const c = props.cluster
  form.value = c
    ? { title: c.title, storyline_id: c.storyline_id, heat: c.heat, status: c.status, location_id: c.location_id, quest_id: c.quest_id, notes: c.notes ?? '', entity_ids: (c.entities ?? []).map(e => e.id), heat_pinned: !!c.heat_pinned, clock_size: c.clock_size ?? null, clock_label: c.clock_label ?? '' }
    : blank()
}, { immediate: true })

const { t } = useI18n()
const clockSizes = computed(() => [{ title: t('story.clock.none'), value: null }, ...[4, 6, 8].map(n => ({ title: t('story.clock.segments', { n }), value: n }))])
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

// Typed a name that matches nothing → create it right from the list
const quickLocationSearch = ref('')
function quickLocationCreated(e: { id: number, name: string }) {
  form.value.location_id = e.id
}

const quickEntitiesSearch = ref('')
function quickEntitiesCreated(e: { id: number, name: string }) {
  form.value.entity_ids.push(e.id)
}
</script>

<style scoped>
.clock-size {
  max-width: 180px;
}
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}
</style>
