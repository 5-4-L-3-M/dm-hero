<template>
  <div class="board">
    <!-- Toolbar: arrange, add a card, start over -->
    <div class="d-flex align-center flex-wrap ga-2 mb-3">
      <span class="text-body-medium text-medium-emphasis">{{ $t(`dashboardBoards.hints.${board}`) }}</span>
      <v-spacer />
      <template v-if="arranging">
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" size="small" variant="tonal" color="primary" prepend-icon="mdi-plus">{{ $t('dashboardBoards.addCard') }}</v-btn>
          </template>
          <v-list density="compact">
            <v-list-item v-for="type in CARD_TYPES" :key="type" :prepend-icon="CARD_ICONS[type]" :title="$t(`dashboardBoards.cards.${type}.title`)" @click="addCard(type)">
              <template #append>
                <v-icon v-if="layout.some(c => c.type === type)" size="small" color="success">mdi-check</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn size="small" variant="text" prepend-icon="mdi-restore" @click="resetBoard">{{ $t('dashboardBoards.reset') }}</v-btn>
      </template>
      <v-btn size="small" :variant="arranging ? 'flat' : 'tonal'" :color="arranging ? 'primary' : undefined" :prepend-icon="arranging ? 'mdi-check' : 'mdi-view-grid-plus-outline'" @click="arranging = !arranging">
        {{ arranging ? $t('dashboardBoards.done') : $t('dashboardBoards.arrange') }}
      </v-btn>
    </div>

    <ClientOnly>
      <GridLayout
        v-model:layout="layout"
        :col-num="12"
        :row-height="60"
        :margin="[12, 12]"
        :is-draggable="arranging"
        :is-resizable="arranging"
        vertical-compact
        use-css-transforms
        @layout-updated="onLayoutUpdated"
      >
        <GridItem
          v-for="c in layout"
          :key="c.i"
          :i="c.i"
          :x="c.x"
          :y="c.y"
          :w="c.w"
          :h="c.h"
          :min-w="2"
          :min-h="1"
          drag-allow-from=".drag-handle"
        >
          <CardFrame :title="$t(`dashboardBoards.cards.${c.type}.title`)" :icon="CARD_ICONS[c.type]" :arranging="arranging" :flush="c.type === 'map'" :bare="c.type === 'pinned' || c.type === 'calendar' || c.type === 'search'" @remove="removeCard(c.i)">
            <SearchCard v-if="c.type === 'search'" />
            <PartyCard v-else-if="c.type === 'party'" :campaign-id="campaignId" />
            <SessionNpcsCard v-else-if="c.type === 'sessionNpcs'" />
            <SessionQuestsCard v-else-if="c.type === 'sessionQuests'" />
            <NextSessionCard v-else-if="c.type === 'nextSession'" :sessions="sessions" />
            <ReputationCard v-else-if="c.type === 'reputation'" />
            <MapCard v-else-if="c.type === 'map'" :campaign-id="campaignId" :map-id="Number(c.config?.mapId) || null" @pick="setConfig(c.i, { mapId: $event })" />
            <DashboardPinboardWidget v-else-if="c.type === 'pinned'" :pins="pinboard.pins" variant="flat" @open-entity="openPin" />
            <ClocksCard v-else-if="c.type === 'clocks'" :campaign-id="campaignId" />
            <OpenRolesCard v-else-if="c.type === 'openRoles'" :campaign-id="campaignId" />
            <ScratchpadCard v-else-if="c.type === 'scratchpad'" :text="String(c.config?.text ?? '')" @change="setConfig(c.i, { text: $event })" />
            <RecapCard v-else-if="c.type === 'recap'" :sessions="sessions" />
            <MusicCard v-else-if="c.type === 'music'" />
            <TodosCard v-else-if="c.type === 'todos'" :campaign-id="campaignId" />
            <DiceTablesCard v-else-if="c.type === 'rollTables'" :campaign-id="campaignId" :sessions="sessions" />
            <DashboardCalendarWidget
              v-else-if="c.type === 'calendar'"
              :calendar="ctx?.calendar ?? null"
              :weather="ctx?.weather ?? null"
              :loading="ctx?.calendarLoading ?? false"
              :days-since-first-session="ctx?.daysSinceFirstSession ?? null"
              variant="flat"
            />
          </CardFrame>
        </GridItem>
      </GridLayout>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { GridItem, GridLayout } from 'grid-layout-plus'
import CardFrame from './CardFrame.vue'
import SearchCard from './SearchCard.vue'
import PartyCard from './PartyCard.vue'
import SessionNpcsCard from './SessionNpcsCard.vue'
import SessionQuestsCard from './SessionQuestsCard.vue'
import NextSessionCard from './NextSessionCard.vue'
import ReputationCard from './ReputationCard.vue'
import MapCard from './MapCard.vue'
import ClocksCard from './ClocksCard.vue'
import OpenRolesCard from './OpenRolesCard.vue'
import ScratchpadCard from './ScratchpadCard.vue'
import RecapCard from './RecapCard.vue'
import MusicCard from './MusicCard.vue'
import TodosCard from './TodosCard.vue'
import DiceTablesCard from './DiceTablesCard.vue'
import { toPreviewType } from '~/stores/entityTabs'
import type { SessionRow } from '~/composables/useSessionPlan'
import type { PinboardItem } from '~~/types/pinboard'
import { CARD_ICONS, CARD_SIZES, CARD_TYPES, type CardType, type DashboardBoardKey, type DashboardCard } from '~~/types/dashboard'

/** One arrangeable dashboard: cards on a 12-column grid, saved per campaign. */
const props = defineProps<{
  board: DashboardBoardKey
  campaignId: number
  sessions: SessionRow[]
  /** Data the overview page already loaded (calendar, weather) */
  ctx?: {
    calendar: { currentDay: number, currentMonth: number, currentMonthName: string, currentYear: number, eraName: string } | null
    weather: { weatherType: string, temperature?: number } | null
    calendarLoading: boolean
    daysSinceFirstSession: number | null
  } | null
}>()

const dash = useDashboardStore()
const story = useStoryBoardStore()
const rep = useReputationStore()
const pinboard = usePinboardStore()
const tabs = useEntityTabsStore()

const arranging = ref(false)
const layout = ref<DashboardCard[]>([])

watch(() => [props.campaignId, props.board] as const, async ([id, board]) => {
  story.load(id)
  rep.load(id)
  await dash.load(id, board)
  layout.value = (dash.layouts[board] ?? []).map(c => ({ ...c }))
}, { immediate: true })

let saveTimer: ReturnType<typeof setTimeout> | null = null
function persist() {
  if (saveTimer) clearTimeout(saveTimer)
  const board = props.board
  saveTimer = setTimeout(() => {
    saveTimer = null
    dash.save(board, layout.value.map(({ i, type, x, y, w, h, config }) => ({ i, type, x, y, w, h, ...(config ? { config } : {}) })))
  }, 400)
}
function onLayoutUpdated() {
  if (arranging.value) persist()
}

function addCard(type: CardType) {
  const size = CARD_SIZES[type]
  const bottom = layout.value.reduce((m, c) => Math.max(m, c.y + c.h), 0)
  let n = 1
  while (layout.value.some(c => c.i === `${type}${n}`)) n++
  layout.value = [...layout.value, { i: `${type}${n}`, type, x: 0, y: bottom, w: size.w, h: size.h }]
  persist()
}
function removeCard(i: string) {
  layout.value = layout.value.filter(c => c.i !== i)
  persist()
}
function setConfig(i: string, changes: Record<string, unknown>) {
  const c = layout.value.find(x => x.i === i)
  if (!c) return
  c.config = { ...(c.config ?? {}), ...changes }
  persist()
}
async function resetBoard() {
  await dash.reset(props.board)
  layout.value = (dash.layouts[props.board] ?? []).map(c => ({ ...c }))
}
function openPin(pin: PinboardItem) {
  const p = toPreviewType(pin.type)
  if (p) tabs.open(p, pin.id, pin.name)
}
</script>

<style scoped>
.board :deep(.vgl-item--placeholder) {
  background: rgba(var(--v-theme-primary), 0.2);
  border-radius: 12px;
}
.board :deep(.vgl-item__resizer) {
  z-index: 3;
}
</style>
