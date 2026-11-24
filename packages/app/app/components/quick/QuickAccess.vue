<template>
  <!-- Always-there button (and Ctrl+K): find anything or ask, without leaving the page -->
  <v-btn
    v-if="campaignStore.hasActiveCampaign"
    class="quick-fab"
    icon
    color="primary"
    size="large"
    elevation="6"
    :aria-label="$t('quick.open')"
    @click="openQuick('find')"
  >
    <v-icon>mdi-lightning-bolt</v-icon>
    <v-tooltip activator="parent" location="left">{{ $t('quick.open') }} (Ctrl+K)</v-tooltip>
  </v-btn>

  <v-dialog v-model="open" max-width="760" scrollable>
    <v-card class="quick-card">
      <v-tabs v-model="tab" density="comfortable" color="primary" grow>
        <v-tab value="find" prepend-icon="mdi-magnify">{{ $t('quick.find') }}</v-tab>
        <v-tab value="ask" prepend-icon="mdi-creation">{{ $t('quick.ask') }}</v-tab>
      </v-tabs>
      <v-divider />

      <!-- FIND -->
      <v-card-text v-if="tab === 'find'" class="quick-body">
        <v-text-field
          ref="findField"
          v-model="query"
          :placeholder="$t('quick.findPlaceholder')"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          autofocus
          class="mb-3"
        />

        <template v-if="!query">
          <div class="quick-section">{{ $t('quick.tonight') }}</div>
          <div v-if="!story.tray.length" class="text-body-medium text-medium-emphasis mb-3">{{ $t('quick.nothingPlanned') }}</div>
          <v-list density="compact" class="py-0 mb-3">
            <v-list-item
              v-for="(b, i) in story.tray"
              :key="b.id"
              :prepend-icon="BEAT_KIND_ICONS[b.kind]"
              :class="{ 'text-medium-emphasis': b.status === 'played' }"
              @click="openBeat(b)"
            >
              <v-list-item-title class="text-wrap">{{ i + 1 }}. {{ b.title }}</v-list-item-title>
              <template #append>
                <v-icon v-if="b.status === 'played'" size="small" color="success">mdi-check-circle</v-icon>
              </template>
            </v-list-item>
          </v-list>

          <div class="quick-section">{{ $t('quick.party') }}</div>
          <div class="d-flex flex-wrap ga-2 mb-3">
            <v-chip v-for="p in players" :key="p.id" variant="tonal" @click="peek('player', p.id)">
              <v-avatar v-if="p.image_url" start :image="`/uploads/${p.image_url}`" />
              <v-icon v-else start>mdi-account-star</v-icon>
              {{ p.name }}
            </v-chip>
          </div>

          <template v-if="openEncounters.length">
            <div class="quick-section">{{ $t('quick.encounters') }}</div>
            <div class="d-flex flex-wrap ga-2 mb-2">
              <v-chip v-for="e in openEncounters" :key="e.id" variant="tonal" prepend-icon="mdi-sword-cross" @click="openEncounter(e.id)">{{ e.name }}</v-chip>
            </div>
          </template>
        </template>

        <template v-else>
          <div v-if="beatHits.length" class="quick-section">{{ $t('quick.beats') }}</div>
          <v-list v-if="beatHits.length" density="compact" class="py-0 mb-2">
            <v-list-item v-for="b in beatHits" :key="`b${b.id}`" :prepend-icon="BEAT_KIND_ICONS[b.kind]" @click="openBeat(b)">
              <v-list-item-title class="text-wrap">{{ b.title }}</v-list-item-title>
              <v-list-item-subtitle v-if="b.tray_order !== null">{{ $t('quick.inTray') }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <div v-if="encounterHits.length" class="quick-section">{{ $t('quick.encounters') }}</div>
          <v-list v-if="encounterHits.length" density="compact" class="py-0 mb-2">
            <v-list-item v-for="e in encounterHits" :key="`e${e.id}`" prepend-icon="mdi-sword-cross" @click="openEncounter(e.id)">
              <v-list-item-title>{{ e.name }}</v-list-item-title>
            </v-list-item>
          </v-list>

          <div v-if="entityHits.length" class="quick-section">{{ $t('quick.entries') }}</div>
          <v-list v-if="entityHits.length" density="compact" class="py-0">
            <v-list-item v-for="r in entityHits" :key="`x${r.id}`" @click="peek(r.previewType, r.id)">
              <template #prepend><v-icon :color="r.color">{{ r.icon }}</v-icon></template>
              <v-list-item-title>{{ r.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ r.type }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <div v-if="!searching && !beatHits.length && !encounterHits.length && !entityHits.length" class="text-body-medium text-medium-emphasis">
            {{ $t('quick.noResults') }}
            <v-btn variant="text" size="small" color="primary" class="ml-1" @click="askAbout">{{ $t('quick.askInstead') }}</v-btn>
          </div>
          <v-progress-linear v-if="searching" indeterminate color="primary" class="mt-2" />
        </template>
      </v-card-text>

      <!-- ASK -->
      <template v-else>
        <v-card-text ref="chatBox" class="quick-body quick-chat">
          <div v-if="!chat.length" class="text-body-medium text-medium-emphasis">
            {{ $t('quick.askIntro') }}
            <div class="d-flex flex-wrap ga-2 mt-3">
              <v-chip v-for="s in suggestions" :key="s" size="small" variant="outlined" @click="send(s)">{{ s }}</v-chip>
            </div>
          </div>
          <div v-for="(m, i) in chat" :key="i" class="mb-3" :class="m.role === 'user' ? 'quick-user' : 'quick-bot'">
            <div v-if="m.role === 'user'" class="quick-bubble">{{ m.text }}</div>
            <SharedFormattedText v-else :text="m.text" class="text-body-medium" />
          </div>

          <v-card v-if="pending.length" variant="tonal" color="warning" class="mb-3">
            <v-card-text class="pb-2">
              <div class="text-title-small mb-1">{{ $t('quick.confirmTitle') }}</div>
              <ul class="pl-4">
                <li v-for="p in pending" :key="p.id">{{ p.summary }}</li>
              </ul>
            </v-card-text>
            <v-card-actions>
              <v-btn color="primary" variant="flat" :loading="thinking" @click="decide(true)">{{ $t('quick.confirm') }}</v-btn>
              <v-btn variant="text" :disabled="thinking" @click="decide(false)">{{ $t('common.cancel') }}</v-btn>
            </v-card-actions>
          </v-card>

          <div v-if="thinking && !pending.length" class="d-flex align-center text-medium-emphasis">
            <v-progress-circular indeterminate size="16" width="2" class="mr-2" />{{ $t('quick.thinking') }}
          </div>
          <v-alert v-if="askError" type="error" variant="tonal" density="compact" class="mt-2">
            {{ askError }}
            <v-btn v-if="needsKey" variant="text" size="small" to="/settings" class="ml-1" @click="open = false">{{ $t('quick.openSettings') }}</v-btn>
          </v-alert>
        </v-card-text>
        <v-divider />
        <div class="d-flex align-center pa-3 ga-2">
          <v-text-field
            v-model="question"
            :placeholder="$t('quick.askPlaceholder')"
            variant="outlined"
            density="comfortable"
            hide-details
            autofocus
            :disabled="thinking || pending.length > 0"
            @keydown.enter.prevent="send()"
          />
          <v-btn icon="mdi-send" color="primary" :disabled="!question.trim() || thinking || pending.length > 0" :aria-label="$t('quick.send')" @click="send()" />
          <v-btn icon="mdi-broom" variant="text" :disabled="thinking" :aria-label="$t('quick.clear')" @click="clearChat" />
        </div>
      </template>
    </v-card>
  </v-dialog>

  <!-- Beat pop-up -->
  <v-dialog v-model="beatOpen" max-width="680" scrollable>
    <v-card v-if="beat">
      <v-card-title class="d-flex align-center text-wrap">
        <v-icon class="mr-2">{{ BEAT_KIND_ICONS[beat.kind] }}</v-icon>{{ beat.title }}
      </v-card-title>
      <v-card-text style="max-height: 70vh">
        <div class="d-flex flex-wrap ga-2 mb-3">
          <v-chip size="small" variant="tonal">{{ $t(`story.kind.${beat.kind}`) }}</v-chip>
          <v-chip size="small" variant="tonal" :color="beat.status === 'played' ? 'success' : undefined">{{ $t(`story.beatStatus.${beat.status}`) }}</v-chip>
          <v-chip v-if="beat.location_name" size="small" variant="tonal" prepend-icon="mdi-map-marker" @click="beat.location_id && peek('location', beat.location_id)">{{ beat.location_name }}</v-chip>
        </div>
        <SharedFormattedText v-if="beat.body" :text="beat.body" class="text-body-medium" />
        <div v-else class="text-body-medium text-medium-emphasis">{{ $t('quick.noText') }}</div>
        <template v-if="beat.entities.length">
          <div class="quick-section mt-4">{{ $t('quick.linked') }}</div>
          <div class="d-flex flex-wrap ga-2">
            <v-chip v-for="e in beat.entities" :key="`${e.type}${e.id}`" size="small" variant="tonal" @click="peekLinked(e)">{{ e.name }}</v-chip>
          </div>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" prepend-icon="mdi-format-list-numbered" to="/story?tab=run" @click="closeAll">{{ $t('quick.runSheet') }}</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="beatOpen = false">{{ $t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Encounter pop-up -->
  <v-dialog v-model="encOpen" max-width="680" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center text-wrap"><v-icon class="mr-2">mdi-sword-cross</v-icon>{{ enc?.name }}</v-card-title>
      <v-card-text style="max-height: 70vh">
        <v-progress-linear v-if="encLoading" indeterminate color="primary" />
        <template v-else-if="enc">
          <v-table density="compact" class="mb-3">
            <thead><tr><th>{{ $t('quick.who') }}</th><th>AC</th><th>HP</th><th>{{ $t('quick.init') }}</th></tr></thead>
            <tbody>
              <tr v-for="p in enc.participants" :key="p.id" :class="{ 'text-medium-emphasis': p.is_ko }">
                <td><a v-if="p.entity_id" href="#" @click.prevent="peek('npc', p.entity_id)">{{ p.display_name }}</a><span v-else>{{ p.display_name }}</span></td>
                <td>{{ p.statblock?.ac ?? '—' }}</td>
                <td>{{ p.current_hp ?? '—' }}/{{ p.max_hp ?? '—' }}</td>
                <td>{{ p.initiative ?? '—' }}</td>
              </tr>
            </tbody>
          </v-table>
          <template v-if="ships.length">
            <div class="quick-section">{{ $t('quick.ships') }}</div>
            <div v-for="s in ships" :key="s.id" class="mb-2 text-body-medium">
              <strong>{{ s.name }}</strong> · AC {{ s.data?.ac }} · {{ $t('quick.hull') }} {{ s.data?.hull }}/{{ s.data?.hullMax }}
              <div v-for="w in s.data?.weapons ?? []" :key="w.id" class="text-body-small text-medium-emphasis">
                {{ w.count }}× {{ w.name }} ({{ w.mount }}): {{ w.toHit }}, {{ w.damage }}<span v-if="w.notes"> · {{ w.notes }}</span>
              </div>
            </div>
          </template>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" prepend-icon="mdi-open-in-new" to="/encounters" @click="closeAll">{{ $t('quick.openEncounters') }}</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="encOpen = false">{{ $t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { BEAT_KIND_ICONS, type LinkedEntity, type StoryBeat } from '~~/types/story'
import type { EntityPreviewType } from '~/components/shared/EntityPreviewDialog.vue'

const { t } = useI18n()
const campaignStore = useCampaignStore()
const story = useStoryBoardStore()
const entityPeek = useEntityPeekStore()

const open = ref(false)
const tab = ref<'find' | 'ask'>('find')
const query = ref('')

const campaignId = computed(() => campaignStore.activeCampaignIdNumber)

interface PlayerLite { id: number, name: string, image_url: string | null }
interface EncounterLite { id: number, name: string, status: string }
const players = ref<PlayerLite[]>([])
const encounters = ref<EncounterLite[]>([])
const openEncounters = computed(() => encounters.value.filter(e => e.status !== 'finished'))

async function loadBasics() {
  if (!campaignId.value) return
  await Promise.all([
    story.load(campaignId.value).catch(() => {}),
    $fetch<PlayerLite[]>(`/api/players?campaignId=${campaignId.value}`).then((r) => { players.value = r ?? [] }).catch(() => {}),
    $fetch<EncounterLite[]>(`/api/encounters?campaignId=${campaignId.value}`).then((r) => { encounters.value = r ?? [] }).catch(() => {}),
  ])
}

function openQuick(which: 'find' | 'ask') {
  tab.value = which
  open.value = true
  loadBasics()
}

// ---- find ----
const PREVIEW_TYPES: EntityPreviewType[] = ['npc', 'location', 'item', 'faction', 'lore', 'player', 'quest']
interface SearchRow { id: number, name: string, type: string, icon: string, color: string }
const entityResults = ref<SearchRow[]>([])
const searching = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!q || !campaignId.value) {
    entityResults.value = []
    return
  }
  searching.value = true
  searchTimer = setTimeout(async () => {
    try {
      entityResults.value = await $fetch<SearchRow[]>(`/api/search?q=${encodeURIComponent(q)}&campaignId=${campaignId.value}`) ?? []
    }
    catch {
      entityResults.value = []
    }
    finally {
      searching.value = false
    }
  }, 200)
})

const entityHits = computed(() => entityResults.value
  .map(r => ({ ...r, previewType: r.type.toLowerCase() as EntityPreviewType }))
  .filter(r => PREVIEW_TYPES.includes(r.previewType))
  .slice(0, 12))

const beatHits = computed(() => {
  const q = query.value?.toLowerCase().trim()
  if (!q) return []
  return story.beats
    .filter(b => !b.archived && `${b.title} ${b.body ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.tray_order !== null) - Number(a.tray_order !== null))
    .slice(0, 8)
})
const encounterHits = computed(() => {
  const q = query.value?.toLowerCase().trim()
  return q ? encounters.value.filter(e => e.name.toLowerCase().includes(q)).slice(0, 5) : []
})

function peek(type: EntityPreviewType, id: number) {
  entityPeek.show(type, id)
}
function peekLinked(e: LinkedEntity) {
  const type = e.type.toLowerCase() as EntityPreviewType
  if (PREVIEW_TYPES.includes(type)) peek(type, e.id)
}

// ---- beat pop-up ----
const beat = ref<StoryBeat | null>(null)
const beatOpen = ref(false)
function openBeat(b: StoryBeat) {
  beat.value = b
  beatOpen.value = true
}

// ---- encounter pop-up ----
interface Participant { id: number, entity_id: number | null, display_name: string, current_hp: number | null, max_hp: number | null, initiative: number | null, is_ko: number, statblock?: { ac?: number } | null }
interface Ship { id: number, name: string, data?: { ac?: number, hull?: number, hullMax?: number, weapons?: Array<{ id: string, count: number, name: string, mount: string, toHit: string, damage: string, notes?: string }> } }
const enc = ref<{ name: string, participants: Participant[] } | null>(null)
const ships = ref<Ship[]>([])
const encOpen = ref(false)
const encLoading = ref(false)
async function openEncounter(id: number) {
  encOpen.value = true
  encLoading.value = true
  enc.value = encounters.value.find(e => e.id === id) ? { name: encounters.value.find(e => e.id === id)!.name, participants: [] } : null
  try {
    const [e, n] = await Promise.all([
      $fetch<{ name: string, participants: Participant[] }>(`/api/encounters/${id}`),
      $fetch<{ ships?: Ship[] }>(`/api/naval/encounter/${id}`).catch(() => null),
    ])
    enc.value = e
    ships.value = n?.ships ?? []
  }
  finally {
    encLoading.value = false
  }
}

function closeAll() {
  beatOpen.value = false
  encOpen.value = false
  open.value = false
}

// ---- ask ----
interface ApiBlock { type: string, text?: string }
interface ApiMessage { role: 'user' | 'assistant', content: string | ApiBlock[] }
interface Pending { id: string, tool: string, summary: string }
const messages = ref<ApiMessage[]>([])
const chat = ref<Array<{ role: 'user' | 'assistant', text: string }>>([])
const pending = ref<Pending[]>([])
const question = ref('')
const thinking = ref(false)
const askError = ref('')
const needsKey = ref(false)
const chatBox = ref<{ $el: HTMLElement } | null>(null)

const suggestions = computed(() => [t('quick.suggest1'), t('quick.suggest2'), t('quick.suggest3')])

function scrollDown() {
  nextTick(() => {
    const el = chatBox.value?.$el
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function turn(body: { messages: ApiMessage[], decision?: { approve: boolean } }) {
  if (!campaignId.value) return
  thinking.value = true
  askError.value = ''
  needsKey.value = false
  try {
    const r = await $fetch<{ messages: ApiMessage[], reply?: string, pending?: Pending[], changed?: boolean }>('/api/assistant/chat', {
      method: 'POST',
      body: { campaignId: campaignId.value, ...body },
    })
    messages.value = r.messages
    if (r.reply) chat.value.push({ role: 'assistant', text: r.reply })
    pending.value = r.pending ?? []
    if (r.changed) story.load(campaignId.value, true).catch(() => {})
  }
  catch (e) {
    const err = e as { data?: { message?: string }, statusCode?: number }
    askError.value = err.data?.message || t('quick.askFailed')
    needsKey.value = /API key/i.test(askError.value)
  }
  finally {
    thinking.value = false
    scrollDown()
  }
}

async function send(text?: string) {
  const q = (text ?? question.value).trim()
  if (!q || thinking.value) return
  question.value = ''
  chat.value.push({ role: 'user', text: q })
  scrollDown()
  await turn({ messages: [...messages.value, { role: 'user', content: q }] })
}

async function decide(approve: boolean) {
  const list = pending.value.map(p => p.summary)
  pending.value = []
  chat.value.push({ role: 'user', text: approve ? `${t('quick.confirmed')}: ${list.join(' · ')}` : t('quick.declined') })
  await turn({ messages: messages.value, decision: { approve } })
}

function clearChat() {
  messages.value = []
  chat.value = []
  pending.value = []
  askError.value = ''
}

function askAbout() {
  const q = query.value
  tab.value = 'ask'
  send(q)
}

// ---- hotkey ----
function onKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (open.value) open.value = false
    else if (campaignStore.hasActiveCampaign) openQuick('find')
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.quick-fab {
  position: fixed;
  right: 24px;
  bottom: 96px; /* sits above the pages' own "+" buttons */
  z-index: 1004;
}
.quick-card {
  min-height: 420px;
}
.quick-body {
  max-height: 62vh;
  overflow-y: auto;
}
.quick-section {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin: 4px 0 6px;
}
.quick-user {
  display: flex;
  justify-content: flex-end;
}
.quick-bubble {
  background: rgba(var(--v-theme-primary), 0.12);
  border-radius: 12px;
  padding: 6px 12px;
  max-width: 85%;
  white-space: pre-wrap;
}
</style>
