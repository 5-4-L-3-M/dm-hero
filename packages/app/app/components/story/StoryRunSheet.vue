<template>
  <div class="run-sheet mx-auto">
    <v-card variant="tonal" class="pa-3 mb-4">
      <div class="d-flex flex-wrap align-center ga-3">
        <div class="d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-account-group</v-icon>
          <span class="text-body-medium">
            {{ $t('story.party.label') }}:
            <strong v-if="partyLocation"><SharedEntityLink :id="partyLocation.id" type="Location" :name="partyLocation.name" /></strong>
            <span v-else class="text-medium-emphasis">{{ $t('story.party.unknown') }}</span>
          </span>
        </div>
        <v-spacer />
        <v-select
          v-model="sessionId"
          :items="sessionOptions"
          :label="$t('story.run.logTo')"
          prepend-inner-icon="mdi-book-open-page-variant"
          variant="outlined"
          density="compact"
          clearable
          hide-details
          class="session-field"
        />
      </div>
    </v-card>

    <div v-if="!store.tray.length" class="text-center py-12 text-medium-emphasis">
      <v-icon size="56" class="mb-2">mdi-calendar-blank</v-icon>
      <div class="text-title-medium mb-1">{{ $t('story.run.emptyTitle') }}</div>
      <div class="text-body-medium">{{ $t('story.run.emptyText') }}</div>
    </div>

    <v-card
      v-for="(beat, i) in store.tray"
      :key="beat.id"
      class="mb-3 run-beat"
      :style="{ '--beat-color': `rgb(var(--v-theme-${colorOfBeat(beat)}))` }"
      variant="outlined"
    >
      <div class="d-flex align-start pa-3">
        <div class="run-num text-headline-small mr-3">{{ i + 1 }}</div>
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex align-center flex-wrap ga-2 mb-1">
            <v-icon size="small">{{ BEAT_KIND_ICONS[beat.kind] }}</v-icon>
            <span class="text-title-medium font-weight-bold">{{ beat.title }}</span>
            <v-chip v-if="clusterOf(beat)" size="x-small" variant="tonal">{{ clusterOf(beat)!.title }}</v-chip>
          </div>
          <SharedFormattedText v-if="beat.body" :text="beat.body" class="text-body-medium mb-2" />
          <div v-if="beat.location_name || beat.entities.length" class="d-flex flex-wrap ga-1">
            <v-chip v-if="beat.location_name" size="small" variant="tonal" color="green">
              <v-icon start size="small">mdi-map-marker</v-icon>
              <SharedEntityLink :id="beat.location_id" type="Location" :name="beat.location_name" />
            </v-chip>
            <v-chip v-for="e in beat.entities" :key="e.id" size="small" variant="tonal">
              <v-icon start size="small">{{ iconFor(e.type) }}</v-icon>
              <SharedEntityLink :id="e.id" :type="e.type" :name="e.name" />
            </v-chip>
          </div>
        </div>
        <div class="d-flex flex-column ga-1 ml-2">
          <v-btn color="success" variant="flat" size="small" prepend-icon="mdi-check" @click="markPlayed(beat)">{{ $t('story.run.played') }}</v-btn>
          <v-btn variant="text" size="small" prepend-icon="mdi-arrow-u-left-top" @click="skip(beat)">{{ $t('story.run.skip') }}</v-btn>
          <v-btn v-if="repSubjects(beat).length" variant="text" size="small" prepend-icon="mdi-scale-balance" @click="openRep(beat)">{{ $t('reputation.short') }}</v-btn>
        </div>
      </div>
    </v-card>

    <!-- Played this session: nothing disappears for good, put it back with one click -->
    <div v-if="playedHere.length" class="mt-6">
      <div class="d-flex align-center mb-2">
        <v-icon class="mr-2" color="success">mdi-check-all</v-icon>
        <span class="text-title-small font-weight-bold">{{ $t('story.run.playedTitle') }}</span>
        <v-chip size="x-small" class="ml-2">{{ playedHere.length }}</v-chip>
      </div>
      <v-card v-for="beat in playedHere" :key="beat.id" variant="tonal" class="mb-2 played-beat">
        <div class="d-flex align-center pa-2 ga-2">
          <v-icon size="small">{{ BEAT_KIND_ICONS[beat.kind] }}</v-icon>
          <span class="flex-grow-1 text-body-medium">{{ beat.title }}</span>
          <v-btn size="small" variant="text" prepend-icon="mdi-restore" @click="restore(beat)">{{ $t('story.run.restore') }}</v-btn>
        </div>
      </v-card>
    </div>

    <RepLogDialog v-model="repOpen" :subjects="repFor" :reason="repReason" />

    <v-snackbar v-model="undoOpen" :timeout="8000" location="bottom">
      {{ undoText }}
      <template #actions>
        <v-btn color="primary" variant="text" @click="undo">{{ $t('story.run.undo') }}</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import RepLogDialog from '~/components/reputation/RepLogDialog.vue'
import type { RepSubjectType } from '~~/types/reputation'
import { BEAT_KIND_ICONS, clusterColor, NO_COLOR, type StoryBeat } from '~~/types/story'
import { ENTITY_PREVIEW_CONFIG } from '~/utils/entityPreview'
import { toPreviewType } from '~/stores/entityTabs'

/** The next-session tray as a clean run sheet: read it at the table, tick beats off as they happen. */
const { t } = useI18n()
const store = useStoryBoardStore()

const sessions = ref<{ id: number, session_number: number | null, title: string }[]>([])
const sessionId = ref<number | null>(null)

onMounted(async () => {
  if (!store.campaignId) return
  sessions.value = await $fetch<typeof sessions.value>('/api/sessions', { query: { campaignId: store.campaignId } }).catch(() => [])
  // Default: the newest session (highest number)
  const newest = [...sessions.value].sort((a, b) => (b.session_number ?? 0) - (a.session_number ?? 0) || b.id - a.id)[0]
  sessionId.value = newest?.id ?? null
})

const sessionOptions = computed(() => sessions.value.map(s => ({ title: s.session_number ? `#${s.session_number} ${s.title}` : s.title, value: s.id })))
const partyLocation = computed(() => store.locations.find(l => l.id === store.settings.party_location_id) ?? null)

const clusterOf = (b: StoryBeat) => store.clusters.find(c => c.id === b.cluster_id) ?? null
function colorOfBeat(b: StoryBeat) {
  const c = clusterOf(b)
  return c ? clusterColor(c, 'storyline', store.storylines) : NO_COLOR
}
function iconFor(type: string) {
  const p = toPreviewType(type)
  return p ? ENTITY_PREVIEW_CONFIG[p].icon : 'mdi-link'
}

// Reputation nudges for the people / factions / places in a beat
const repOpen = ref(false)
const repFor = ref<Array<{ id: number, name: string, type: RepSubjectType }>>([])
const repReason = ref('')
function repSubjects(beat: StoryBeat) {
  const list = beat.entities.filter(e => ['NPC', 'Faction', 'Location'].includes(e.type)).map(e => ({ id: e.id, name: e.name, type: e.type as RepSubjectType }))
  if (beat.location_id && beat.location_name && !list.some(x => x.id === beat.location_id)) list.push({ id: beat.location_id, name: beat.location_name, type: 'Location' })
  return list
}
function openRep(beat: StoryBeat) {
  repFor.value = repSubjects(beat)
  repReason.value = beat.title
  repOpen.value = true
}

// What the last Played / Skip changed, so Undo can put it back exactly
interface Snapshot { id: number, status: StoryBeat['status'], played_session_id: number | null, trayIds: number[] }
const last = ref<Snapshot | null>(null)
const undoOpen = ref(false)
const undoText = ref('')

function remember(beat: StoryBeat, text: string) {
  last.value = { id: beat.id, status: beat.status, played_session_id: beat.played_session_id, trayIds: store.tray.map(b => b.id) }
  undoText.value = text
  undoOpen.value = true
}

async function markPlayed(beat: StoryBeat) {
  remember(beat, t('story.run.markedPlayed', { title: beat.title }))
  // Without a session to log to it still counts as played
  await store.updateBeat(beat.id, sessionId.value ? { played_session_id: sessionId.value } : { status: 'played', in_tray: false })
}

async function skip(beat: StoryBeat) {
  remember(beat, t('story.run.skipped', { title: beat.title }))
  await store.updateBeat(beat.id, { in_tray: false })
}

async function undo() {
  const s = last.value
  undoOpen.value = false
  if (!s) return
  last.value = null
  await store.updateBeat(s.id, { status: s.status, played_session_id: s.played_session_id, in_tray: true })
  // Back to the same spot in the list
  await store.saveOrder({ tray: s.trayIds })
}

/** Beats logged to the chosen session (or marked played without one) that can go back */
const playedHere = computed(() => store.beats.filter(b => b.status === 'played' && (sessionId.value ? b.played_session_id === sessionId.value : !b.played_session_id)))

async function restore(beat: StoryBeat) {
  await store.updateBeat(beat.id, { status: 'ready', played_session_id: null, in_tray: true })
}
</script>

<style scoped>
.run-sheet {
  max-width: 900px;
}
.run-beat {
  border-left: 5px solid var(--beat-color) !important;
}
.run-num {
  opacity: 0.4;
  min-width: 28px;
  text-align: right;
}
.session-field {
  max-width: 300px;
  min-width: 220px;
}
.min-w-0 {
  min-width: 0;
}
</style>
