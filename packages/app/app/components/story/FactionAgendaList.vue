<template>
  <div>
    <div class="d-flex align-center mb-2">
      <span v-if="!hideTitle" class="text-title-small font-weight-bold">{{ $t('story.agenda.title') }}</span>
      <v-spacer />
      <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-plus" @click="edit(null)">{{ $t('story.agenda.add') }}</v-btn>
    </div>

    <div v-if="!agendas.length && !loading" class="text-body-small text-medium-emphasis py-2">{{ $t('story.agenda.empty') }}</div>

    <v-card v-for="a in agendas" :key="a.id" variant="outlined" class="mb-2" :class="{ 'agenda--done': a.status !== 'active' }">
      <div class="d-flex align-start pa-3 ga-3">
        <ClockDial :size="a.clock_size" :filled="a.clock_filled" :color="a.clock_filled >= a.clock_size ? 'error' : 'warning'" :readonly="a.status !== 'active'" @update:filled="setFilled(a, $event)" />
        <div class="flex-grow-1 min-w-0">
          <div v-if="!factionId" class="text-body-small text-medium-emphasis">
            <SharedEntityLink :id="a.faction_id" type="Faction" :name="a.faction_name" />
          </div>
          <div class="text-body-medium font-weight-bold">{{ a.goal }}</div>
          <div v-if="a.next_step" class="text-body-small mt-1">
            <v-icon size="x-small" class="mr-1">mdi-arrow-right-bold</v-icon>{{ a.next_step }}
          </div>
          <div class="d-flex align-center ga-1 mt-1">
            <v-chip size="x-small" variant="tonal">{{ a.clock_filled }} / {{ a.clock_size }}</v-chip>
            <v-chip v-if="a.status !== 'active'" size="x-small" :color="a.status === 'achieved' ? 'error' : 'success'" variant="tonal">{{ $t(`story.agenda.status.${a.status}`) }}</v-chip>
            <v-chip v-else-if="a.clock_filled >= a.clock_size" size="x-small" color="error" variant="flat">{{ $t('story.agenda.full') }}</v-chip>
          </div>
        </div>
        <v-btn icon="mdi-pencil" variant="text" size="small" :aria-label="$t('common.edit')" @click="edit(a)" />
      </div>
    </v-card>

    <v-dialog v-model="dialog" max-width="520">
      <v-card>
        <v-card-title>{{ editing ? $t('story.agenda.edit') : $t('story.agenda.add') }}</v-card-title>
        <v-card-text>
          <v-autocomplete
            v-if="!factionId"
            v-model="form.faction_id"
            :items="factions"
            item-title="name"
            item-value="id"
            :label="$t('story.agenda.faction')"
            :disabled="!!editing"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />
          <v-text-field v-model="form.goal" :label="$t('story.agenda.goal')" :placeholder="$t('story.agenda.goalPlaceholder')" variant="outlined" density="comfortable" class="mb-3" />
          <v-text-field v-model="form.next_step" :label="$t('story.agenda.nextStep')" variant="outlined" density="comfortable" class="mb-3" />
          <div class="text-body-small text-medium-emphasis mb-1">{{ $t('story.agenda.clockSize') }}</div>
          <v-btn-toggle v-model="form.clock_size" mandatory density="comfortable" variant="outlined" divided class="mb-3">
            <v-btn v-for="s in CLOCK_SIZES" :key="s" :value="s" size="small">{{ s }}</v-btn>
          </v-btn-toggle>
          <template v-if="editing">
            <div class="text-body-small text-medium-emphasis mb-1">{{ $t('story.agenda.statusLabel') }}</div>
            <v-btn-toggle v-model="form.status" mandatory density="comfortable" variant="outlined" divided>
              <v-btn v-for="s in AGENDA_STATUSES" :key="s" :value="s" size="small">{{ $t(`story.agenda.status.${s}`) }}</v-btn>
            </v-btn-toggle>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="editing" color="error" variant="text" @click="remove">{{ $t('common.delete') }}</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!form.goal.trim() || !(factionId || form.faction_id)" @click="save">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import ClockDial from './ClockDial.vue'
import { AGENDA_STATUSES, CLOCK_SIZES, type AgendaStatus, type FactionAgenda } from '~~/types/story'

/**
 * Faction agendas with progress clocks. With factionId: that faction only
 * (faction page / side panel); without: every faction (World tab).
 */
const props = defineProps<{ campaignId: number, factionId?: number | null, hideTitle?: boolean }>()

const agendas = ref<FactionAgenda[]>([])
const factions = ref<{ id: number, name: string }[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    agendas.value = await $fetch<FactionAgenda[]>('/api/story/agendas', { query: { campaignId: props.campaignId, factionId: props.factionId ?? undefined } })
  }
  finally {
    loading.value = false
  }
}
watch(() => [props.campaignId, props.factionId], load, { immediate: true })

async function setFilled(a: FactionAgenda, filled: number) {
  a.clock_filled = filled
  const saved = await $fetch<FactionAgenda>(`/api/story/agendas/${a.id}`, { method: 'PATCH', body: { clock_filled: filled } })
  Object.assign(a, saved)
}

const dialog = ref(false)
const editing = ref<FactionAgenda | null>(null)
const form = ref({ faction_id: null as number | null, goal: '', next_step: '', clock_size: 6, status: 'active' as AgendaStatus })

async function edit(a: FactionAgenda | null) {
  editing.value = a
  form.value = a
    ? { faction_id: a.faction_id, goal: a.goal, next_step: a.next_step ?? '', clock_size: a.clock_size, status: a.status }
    : { faction_id: props.factionId ?? null, goal: '', next_step: '', clock_size: 6, status: 'active' }
  if (!props.factionId && !factions.value.length) {
    const { entities } = await $fetch<{ entities: { id: number, name: string, type: string }[] }>('/api/story/entities', { query: { campaignId: props.campaignId } })
    factions.value = entities.filter(e => e.type === 'Faction')
  }
  dialog.value = true
}

async function save() {
  const body = { ...form.value, faction_id: props.factionId ?? form.value.faction_id, next_step: form.value.next_step || null }
  if (editing.value) await $fetch(`/api/story/agendas/${editing.value.id}`, { method: 'PATCH', body })
  else await $fetch('/api/story/agendas', { method: 'POST', body: { campaignId: props.campaignId, ...body } })
  dialog.value = false
  await load()
}

async function remove() {
  if (!editing.value) return
  await $fetch(`/api/story/agendas/${editing.value.id}`, { method: 'DELETE' })
  dialog.value = false
  await load()
}
</script>

<style scoped>
.agenda--done {
  opacity: 0.6;
}
.min-w-0 {
  min-width: 0;
}
</style>
