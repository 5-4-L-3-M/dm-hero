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
        <span v-if="store.tray.length || playedHere.length" class="text-body-medium text-medium-emphasis">
          {{ $t('story.run.progress', { left: store.tray.length, played: playedHere.length }) }}
        </span>
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

    <!-- One section per cluster; big pick-what-they-visit groups show as a short list -->
    <section v-for="g in groups" :key="g.key" class="run-group mb-4" :style="{ '--group-color': colorCss(groupColor(g)) }">
      <button type="button" class="run-group__head" @click="folds.toggle(g.key, g.beats.length)">
        <v-icon size="small">{{ folds.isFolded(g.key, g.beats.length) ? 'mdi-chevron-right' : 'mdi-chevron-down' }}</v-icon>
        <span class="run-group__dot" />
        <span class="run-group__title">{{ g.cluster?.title ?? $t('story.sparks.title') }}</span>
        <span class="run-group__count">{{ g.beats.length }}</span>
        <span v-if="isList(g) && !folds.isFolded(g.key, g.beats.length)" class="run-group__hint">{{ $t('story.run.listHint') }}</span>
      </button>

      <template v-if="!folds.isFolded(g.key, g.beats.length)">
        <template v-for="beat in g.beats" :key="beat.id">
          <!-- Short row: click to open the full card -->
          <div
            v-if="isList(g) && !opened.has(beat.id)"
            class="run-row"
            role="button"
            tabindex="0"
            @click="toggleOpen(beat.id)"
            @keydown.enter="toggleOpen(beat.id)"
          >
            <span class="run-row__num">{{ num.get(beat.id) }}</span>
            <v-icon size="small" class="run-row__icon">{{ BEAT_KIND_ICONS[beat.kind] }}</v-icon>
            <span class="run-row__title">{{ beat.title }}</span>
            <span class="run-row__who">{{ whoOf(beat) }}</span>
            <v-btn icon variant="text" size="small" color="success" @click.stop="markPlayed(beat)">
              <v-icon>mdi-check</v-icon>
              <v-tooltip activator="parent" location="top">{{ $t('story.run.played') }}</v-tooltip>
            </v-btn>
            <v-icon size="small" class="run-row__chevron">mdi-chevron-down</v-icon>
          </div>

          <!-- Full card -->
          <v-card v-else class="mb-2 run-beat" :style="{ '--beat-color': colorCss(groupColor(g)) }" variant="outlined">
            <div class="pa-3">
              <div class="d-flex align-center ga-2 mb-1">
                <span class="run-num">{{ num.get(beat.id) }}</span>
                <v-icon size="small">{{ BEAT_KIND_ICONS[beat.kind] }}</v-icon>
                <span class="text-title-medium font-weight-bold run-title" :class="{ 'cursor-pointer': isList(g) }" @click="isList(g) && toggleOpen(beat.id)">{{ beat.title }}</span>
                <v-spacer />
                <div class="run-actions">
                  <v-btn color="success" variant="tonal" size="small" prepend-icon="mdi-check" @click="markPlayed(beat)">{{ $t('story.run.played') }}</v-btn>
                  <v-btn icon variant="text" size="small" @click="skip(beat)">
                    <v-icon>mdi-arrow-u-left-top</v-icon>
                    <v-tooltip activator="parent" location="top">{{ $t('story.run.skip') }}</v-tooltip>
                  </v-btn>
                  <v-btn v-if="repSubjects(beat).length" icon variant="text" size="small" @click="openRep(beat)">
                    <v-icon>mdi-scale-balance</v-icon>
                    <v-tooltip activator="parent" location="top">{{ $t('reputation.short') }}</v-tooltip>
                  </v-btn>
                  <v-btn v-if="isList(g)" icon variant="text" size="small" @click="toggleOpen(beat.id)">
                    <v-icon>mdi-chevron-up</v-icon>
                  </v-btn>
                </div>
              </div>
              <SharedFormattedText v-if="beat.body" :text="beat.body" class="text-body-medium run-body mb-2" />
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
          </v-card>
        </template>
      </template>
    </section>

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
import { BEAT_KIND_ICONS, clusterColor, colorCss, NO_COLOR, type StoryBeat } from '~~/types/story'
import { ENTITY_PREVIEW_CONFIG } from '~/utils/entityPreview'
import { toPreviewType } from '~/stores/entityTabs'
import { groupTray, TRAY_BIG_GROUP, trayNumbers, type TrayGroup } from '~/utils/storyTray'

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

const groups = computed(() => groupTray(store.tray, store.clusters))
const num = computed(() => trayNumbers(store.tray))
const folds = useTrayFolds('runFolds', TRAY_BIG_GROUP)
/** Big groups (open time: shops, places to visit) read as a short list */
const isList = (g: TrayGroup) => g.beats.length > TRAY_BIG_GROUP
const groupColor = (g: TrayGroup) => (g.cluster ? clusterColor(g.cluster, 'storyline', store.storylines) : NO_COLOR)

const opened = ref(new Set<number>())
function toggleOpen(id: number) {
  const next = new Set(opened.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  opened.value = next
}
/** "Foxglove & Fennel · Rosalind, Wisp" for the short rows */
function whoOf(beat: StoryBeat) {
  const people = beat.entities.filter(e => e.type === 'NPC').map(e => e.name.split(' ')[0])
  const shown = people.slice(0, 3).join(', ') + (people.length > 3 ? ` +${people.length - 3}` : '')
  return shown
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
.run-group__head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 2px;
  margin-bottom: 6px;
  text-align: left;
  color: inherit;
  background: none;
  border: 0;
  border-bottom: 2px solid var(--group-color);
  cursor: pointer;
}
.run-group__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--group-color);
  flex-shrink: 0;
}
.run-group__title {
  font-size: 1.1rem;
  font-weight: 700;
}
.run-group__count {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.1);
}
.run-group__hint {
  font-size: 0.85rem;
  opacity: 0.6;
}
.run-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 6px 2px 10px;
  margin-bottom: 2px;
  border-radius: 8px;
  border-left: 4px solid var(--group-color);
  background: rgba(var(--v-theme-on-surface), 0.03);
  cursor: pointer;
}
.run-row:hover,
.run-row:focus-visible {
  background: rgba(var(--v-theme-on-surface), 0.08);
  outline: none;
}
.run-row__num {
  min-width: 1.8em;
  text-align: right;
  font-weight: 700;
  opacity: 0.45;
}
.run-row__icon,
.run-row__chevron {
  opacity: 0.6;
}
.run-row__title {
  font-weight: 600;
  min-width: 0;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.run-row__who {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85rem;
  opacity: 0.6;
}
.run-beat {
  border-left: 5px solid var(--beat-color) !important;
}
.run-num {
  font-weight: 700;
  opacity: 0.45;
  min-width: 1.8em;
  text-align: right;
}
.run-title {
  min-width: 0;
}
.run-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.run-body {
  line-height: 1.55;
  max-width: 72ch;
}
.session-field {
  max-width: 300px;
  min-width: 220px;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
