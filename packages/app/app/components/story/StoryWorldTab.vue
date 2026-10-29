<template>
  <v-row>
    <!-- World timeline: dated events around the current in-game date -->
    <v-col cols="12" md="7">
      <v-card variant="tonal" class="pa-3 mb-3 d-flex align-center flex-wrap ga-2">
        <v-icon color="primary">mdi-calendar-today</v-icon>
        <span class="text-body-medium">{{ $t('story.world.today') }}:</span>
        <strong class="text-body-large">{{ today ? formatDate(today) : '—' }}</strong>
        <v-spacer />
        <v-btn variant="text" size="small" to="/calendar" prepend-icon="mdi-calendar">{{ $t('calendar.title') }}</v-btn>
      </v-card>

      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <span class="text-title-small font-weight-bold">{{ $t('story.world.timeline') }}</span>
        <v-spacer />
        <v-switch v-model="showAll" :label="$t('story.world.showAll')" color="primary" density="compact" hide-details />
        <v-btn color="primary" variant="flat" size="small" prepend-icon="mdi-plus" @click="openEvent(null)">{{ $t('story.world.addEvent') }}</v-btn>
      </div>

      <div v-if="!shownEvents.length" class="text-body-medium text-medium-emphasis py-6 text-center">{{ $t('story.world.empty') }}</div>

      <template v-for="group in groups" :key="group.key">
        <div v-if="group.events.length" class="d-flex align-center my-2">
          <v-icon size="small" class="mr-1" :color="group.key === 'upcoming' ? 'primary' : undefined">{{ group.key === 'upcoming' ? 'mdi-arrow-down-bold-circle' : 'mdi-history' }}</v-icon>
          <span class="text-body-small font-weight-bold text-uppercase text-no-wrap">{{ $t(`story.world.${group.key}`) }}</span>
          <v-divider class="ml-2" />
        </div>
        <v-card
          v-for="ev in group.events"
          :key="ev.id"
          variant="outlined"
          class="mb-2 world-event"
          :class="{ 'world-event--past': group.key === 'past' }"
          @click="openEvent(ev)"
        >
          <div class="d-flex pa-3 ga-3">
            <div class="world-date text-center">
              <div class="text-headline-small">{{ ev.day }}</div>
              <div class="text-body-small">{{ monthName(ev.month) }}</div>
              <div class="text-body-small text-medium-emphasis">{{ ev.is_recurring ? '↻' : ev.year }}</div>
            </div>
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex align-center ga-1">
                <v-icon v-if="ev.event_type !== 'world'" size="x-small">mdi-calendar</v-icon>
                <span class="text-body-large font-weight-bold">{{ ev.title }}</span>
              </div>
              <SharedFormattedText v-if="ev.description" :text="ev.description" class="text-body-small mt-1" />
              <div v-if="ev.linked_entities?.length" class="d-flex flex-wrap ga-1 mt-1" @click.stop>
                <v-chip v-for="le in ev.linked_entities" :key="le.entity_id" size="x-small" variant="tonal">
                  <SharedEntityLink :id="le.entity_id" :type="le.entity_type" :name="le.entity_name" />
                </v-chip>
              </div>
            </div>
          </div>
        </v-card>
      </template>
    </v-col>

    <!-- Faction agendas with clocks -->
    <v-col cols="12" md="5">
      <FactionAgendaList :campaign-id="campaignId" />
    </v-col>

    <v-dialog v-model="eventOpen" max-width="560">
      <v-card>
        <v-card-title>{{ eventEditing ? $t('story.world.editEvent') : $t('story.world.addEvent') }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="eventForm.title" :label="$t('story.world.eventTitle')" variant="outlined" density="comfortable" autofocus class="mb-3" />
          <v-textarea v-model="eventForm.description" :label="$t('story.world.eventDescription')" variant="outlined" rows="3" auto-grow class="mb-3" />
          <v-row dense>
            <v-col cols="3">
              <v-text-field v-model.number="eventForm.day" :label="$t('story.world.day')" type="number" min="1" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="5">
              <v-select v-model="eventForm.month" :items="monthOptions" :label="$t('story.world.month')" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="4">
              <v-text-field v-model.number="eventForm.year" :label="$t('story.world.year')" type="number" variant="outlined" density="comfortable" />
            </v-col>
          </v-row>
          <v-autocomplete
            v-model="eventForm.entityIds"
            v-model:search="involvedSearch"
            :items="store.entities"
            item-title="name"
            item-value="id"
            :label="$t('story.world.involved')"
            multiple
            chips
            closable-chips
            variant="outlined"
            density="comfortable"
            @update:model-value="involvedSearch = ''"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="eventEditing" color="error" variant="text" @click="deleteEvent">{{ $t('common.delete') }}</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="eventOpen = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!eventForm.title.trim() || !eventForm.month || !eventForm.day" @click="saveEvent">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script setup lang="ts">
import FactionAgendaList from './FactionAgendaList.vue'

/** The wider world: dated world events on the in-game calendar, and what each faction is up to. */
const props = defineProps<{ campaignId: number }>()

interface CalEvent {
  id: number
  title: string
  description: string | null
  event_type: string
  year: number | null
  month: number
  day: number
  is_recurring: number
  linked_entities?: { entity_id: number, entity_type: string | null, entity_name: string }[]
}
interface DateParts { year: number, month: number, day: number }

const store = useStoryBoardStore()

const events = ref<CalEvent[]>([])
const months = ref<{ name: string }[]>([])
const today = ref<DateParts | null>(null)
const showAll = ref(false)

async function load() {
  const [cal, evs] = await Promise.all([
    $fetch<{ config: { current_year: number, current_month: number, current_day: number } | null, months: { name: string }[] }>('/api/calendar/config', { query: { campaignId: props.campaignId } }).catch(() => null),
    $fetch<CalEvent[]>('/api/calendar/events', { query: { campaignId: props.campaignId } }).catch(() => []),
  ])
  months.value = cal?.months ?? []
  today.value = cal?.config ? { year: cal.config.current_year, month: cal.config.current_month, day: cal.config.current_day } : null
  events.value = evs
}
watch(() => props.campaignId, load, { immediate: true })

const monthName = (m: number) => months.value[m - 1]?.name ?? String(m)
const formatDate = (d: DateParts) => (months.value[d.month - 1] ? `${d.day}. ${monthName(d.month)} ${d.year}` : `${d.day}/${d.month}/${d.year}`)
const monthOptions = computed(() => months.value.map((m, i) => ({ title: m.name, value: i + 1 })))

const shownEvents = computed(() => events.value.filter(e => showAll.value || e.event_type === 'world'))

// Compare (year, month, day); recurring events count as this year
function key(e: CalEvent) {
  const y = e.is_recurring ? (today.value?.year ?? 0) : (e.year ?? 0)
  return y * 10000 + e.month * 100 + e.day
}
const groups = computed(() => {
  const now = today.value ? today.value.year * 10000 + today.value.month * 100 + today.value.day : 0
  const sorted = [...shownEvents.value].sort((a, b) => key(a) - key(b))
  return [
    { key: 'upcoming', events: sorted.filter(e => key(e) >= now) },
    { key: 'past', events: sorted.filter(e => key(e) < now).reverse() },
  ]
})

// --- event dialog ------------------------------------------------------
const eventOpen = ref(false)
// Typed text clears once someone is picked
const involvedSearch = ref('')
const eventEditing = ref<CalEvent | null>(null)
const eventForm = ref({ title: '', description: '', year: 1 as number | null, month: 1, day: 1, entityIds: [] as number[] })

function openEvent(ev: CalEvent | null) {
  eventEditing.value = ev
  eventForm.value = ev
    ? { title: ev.title, description: ev.description ?? '', year: ev.year, month: ev.month, day: ev.day, entityIds: (ev.linked_entities ?? []).map(l => l.entity_id) }
    : { title: '', description: '', year: today.value?.year ?? 1, month: today.value?.month ?? 1, day: today.value?.day ?? 1, entityIds: [] }
  eventOpen.value = true
}

async function saveEvent() {
  const f = eventForm.value
  const body = { title: f.title.trim(), description: f.description || undefined, year: f.year ?? undefined, month: f.month, day: f.day, entityIds: f.entityIds }
  if (eventEditing.value) await $fetch(`/api/calendar/events/${eventEditing.value.id}`, { method: 'PATCH', body })
  else await $fetch('/api/calendar/events', { method: 'POST', body: { ...body, campaignId: props.campaignId, eventType: 'world' } })
  eventOpen.value = false
  await load()
}

async function deleteEvent() {
  if (!eventEditing.value) return
  await $fetch(`/api/calendar/events/${eventEditing.value.id}`, { method: 'DELETE' })
  eventOpen.value = false
  await load()
}
</script>

<style scoped>
.world-date {
  min-width: 64px;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding-right: 12px;
}
.world-event--past {
  opacity: 0.6;
}
.min-w-0 {
  min-width: 0;
}
</style>
