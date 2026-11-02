<template>
  <div class="map-layout" :class="{ 'map-layout--side-closed': !sideOpen }">
    <!-- Folded away: a slim strip with a button to bring the list back -->
    <v-card v-if="!sideOpen" variant="tonal" class="map-side-strip">
      <v-btn icon="mdi-chevron-right" size="small" variant="text" :aria-label="$t('story.map.showList')" :title="$t('story.map.showList')" @click="setSide(true)" />
    </v-card>
    <!-- What can go on the map: drag onto the canvas or click + -->
    <v-card v-else variant="tonal" class="map-side">
      <div class="pa-3 pb-0">
        <div class="d-flex align-center mb-1">
          <div class="text-title-small font-weight-bold flex-grow-1">{{ $t('story.map.addTitle') }}</div>
          <v-btn icon="mdi-chevron-left" size="x-small" variant="text" :aria-label="$t('story.map.hideList')" :title="$t('story.map.hideList')" @click="setSide(false)" />
        </div>
        <div class="text-body-small text-medium-emphasis mb-2">{{ $t('story.map.addHint') }}</div>
        <v-btn-toggle v-model="sideKind" mandatory density="compact" variant="outlined" divided class="mb-2 w-100">
          <v-btn v-for="k in MAP_NODE_KINDS" :key="k" :value="k" size="small" class="flex-grow-1">{{ $t(`story.map.kindsPlural.${k}`) }}</v-btn>
        </v-btn-toggle>
        <v-text-field v-model="sideSearch" :placeholder="$t('common.search')" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable class="mb-2" />
      </div>
      <div class="map-side__list">
        <div
          v-for="it in sideItems"
          :key="`${it.kind}-${it.id}`"
          class="map-side__item"
          draggable="true"
          @dragstart="onDragStart($event, it.kind, it.id)"
        >
          <v-icon size="small" class="mr-2" :color="it.color">{{ it.icon }}</v-icon>
          <div class="flex-grow-1 min-w-0">
            <div class="text-body-medium text-truncate">{{ it.title }}</div>
            <div v-if="it.sub" class="text-body-small text-medium-emphasis text-truncate">{{ it.sub }}</div>
          </div>
          <v-btn icon="mdi-plus" size="x-small" variant="text" :aria-label="$t('story.map.add')" @click="addAtCenter(it.kind, it.id)" />
        </div>
        <div v-if="!sideItems.length" class="text-body-small text-medium-emphasis pa-3">{{ $t('story.map.allPlaced') }}</div>
      </div>
    </v-card>

    <div class="map-main">
      <!-- Acts: like chapters; pick one to see only its cards -->
      <div class="d-flex flex-wrap align-center ga-2 mb-2">
        <v-btn-toggle v-model="viewAct" mandatory density="compact" variant="outlined" divided color="primary" :disabled="nextOnly">
          <v-btn :value="0" size="small">{{ $t('story.map.allActs') }}</v-btn>
          <v-btn v-for="(name, i) in actNames" :key="i" :value="i + 1" size="small">{{ name }}</v-btn>
        </v-btn-toggle>
        <v-btn icon="mdi-pencil" size="small" variant="text" :aria-label="$t('story.map.editActs')" :title="$t('story.map.editActs')" @click="openActs" />
        <v-divider vertical class="mx-1" />
        <!-- Next session: its own filter, across all acts -->
        <v-btn
          prepend-icon="mdi-calendar-arrow-right"
          :variant="nextOnly ? 'flat' : 'outlined'"
          color="primary"
          size="small"
          :title="$t('story.map.nextSessionHint')"
          @click="toggleNext"
        >
          {{ $t('story.map.nextSession') }}
        </v-btn>
      </div>
      <div class="d-flex flex-wrap align-center ga-2 mb-2">
        <v-btn prepend-icon="mdi-sitemap-outline" variant="tonal" color="primary" size="small" :disabled="store.map.nodes.length < 2" @click="arrange">{{ $t('story.map.arrange') }}</v-btn>
        <v-btn prepend-icon="mdi-fit-to-screen-outline" variant="text" size="small" @click="fitView({ padding: 0.2 })">{{ $t('story.map.fit') }}</v-btn>
        <!-- Bigger map: folds the main menu and the list on the left in one click -->
        <v-btn
          :prepend-icon="bigMap ? 'mdi-arrow-collapse-horizontal' : 'mdi-arrow-expand-horizontal'"
          variant="text"
          size="small"
          @click="toggleBigMap"
        >
          {{ bigMap ? $t('story.map.smallerMap') : $t('story.map.biggerMap') }}
        </v-btn>
        <v-divider vertical class="mx-1" />
        <span class="text-body-small text-medium-emphasis">{{ $t('story.filter.storylines') }}</span>
        <v-chip
          v-for="l in store.storylines"
          :key="l.id"
          size="small"
          :color="storylineColor(l)"
          :variant="storylineFilter.includes(l.id) ? 'flat' : 'outlined'"
          @click="toggleStoryline(l.id)"
        >
          {{ l.name }}
        </v-chip>
        <v-btn v-if="storylineFilter.length" size="x-small" variant="text" @click="storylineFilter = []">{{ $t('story.filter.all') }}</v-btn>
      </div>

      <div class="map-canvas" @dragover.prevent @drop="onDrop">
        <ClientOnly>
          <VueFlow
            id="story-map"
            :nodes="flowNodes"
            :edges="flowEdges"
            :delete-key-code="null"
            :min-zoom="0.2"
            :max-zoom="2"
            :default-edge-options="{ type: 'smoothstep', markerEnd: MarkerType.ArrowClosed }"
            fit-view-on-init
            @connect="onConnect"
            @node-drag-stop="onDragStop"
            @edge-click="onEdgeClick"
          >
            <template #node-story="{ data }">
              <StoryMapCard
                :item="data.item"
                :dim="isDim(data.storylineId)"
                :act="data.act"
                :acts="actNames"
                @open="openItem(data.kind, data.refId)"
                @edit="editItem(data.kind, data.refId)"
                @remove="store.removeMapNode(data.mapId)"
                @set-act="store.setMapNodeAct(data.mapId, $event)"
                @toggle-next="toggleCardNext(data.kind, data.refId, data.item.inTray)"
                @edit-beat="editItem('beat', $event)"
              />
            </template>
            <Background :gap="24" pattern-color="rgba(128,128,128,0.25)" />
            <Controls :show-interactive="false" position="bottom-right" />
          </VueFlow>
        </ClientOnly>
        <div v-if="!store.map.nodes.length" class="map-empty">
          <v-icon size="48" class="mb-2">mdi-vector-polyline</v-icon>
          <div class="text-title-medium mb-1">{{ $t('story.map.emptyTitle') }}</div>
          <div class="text-body-medium">{{ $t('story.map.emptyText') }}</div>
        </div>
        <div v-else-if="nextOnly && !flowNodes.length" class="map-empty">
          <v-icon size="48" class="mb-2">mdi-calendar-arrow-right</v-icon>
          <div class="text-body-medium">{{ $t('story.map.nextSessionEmpty') }}</div>
        </div>
      </div>
    </div>

    <!-- Arrow: what it means, or remove it -->
    <v-dialog v-model="edgeOpen" max-width="420">
      <v-card>
        <v-card-title>{{ $t('story.map.arrowTitle') }}</v-card-title>
        <v-card-subtitle class="text-wrap">{{ edgeFromTo }}</v-card-subtitle>
        <v-card-text>
          <v-btn-toggle v-model="edgeKind" mandatory density="comfortable" variant="outlined" divided class="mb-3">
            <v-btn value="leads" size="small"><v-icon start>mdi-arrow-right</v-icon>{{ $t('story.map.leads') }}</v-btn>
            <v-btn value="related" size="small"><v-icon start>mdi-dots-horizontal</v-icon>{{ $t('story.map.related') }}</v-btn>
          </v-btn-toggle>
          <v-text-field v-model="edgeLabel" :label="$t('story.map.arrowLabel')" :placeholder="$t('story.map.arrowPlaceholder')" variant="outlined" density="comfortable" autofocus hide-details @keyup.enter="saveEdge" />
        </v-card-text>
        <v-card-actions>
          <v-btn color="error" variant="text" prepend-icon="mdi-delete" @click="deleteEdge">{{ $t('story.map.removeArrow') }}</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="edgeOpen = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveEdge">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Rename / add / remove acts -->
    <v-dialog v-model="actsOpen" max-width="420">
      <v-card>
        <v-card-title>{{ $t('story.map.editActs') }}</v-card-title>
        <v-card-text>
          <div v-for="(_, i) in actsDraft" :key="i" class="d-flex align-center ga-2 mb-2">
            <v-text-field v-model="actsDraft[i]" :label="$t('story.map.actN', { n: i + 1 })" variant="outlined" density="compact" hide-details />
            <v-btn icon="mdi-close" size="small" variant="text" :disabled="actsDraft.length <= 1" :aria-label="$t('common.delete')" @click="actsDraft.splice(i, 1)" />
          </div>
          <v-btn prepend-icon="mdi-plus" variant="text" size="small" :disabled="actsDraft.length >= 12" @click="actsDraft.push($t('story.map.actN', { n: actsDraft.length + 1 }))">{{ $t('story.map.addAct') }}</v-btn>
          <div class="text-body-small text-medium-emphasis mt-2">{{ $t('story.map.actsHint') }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="actsOpen = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveActs">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <StoryBeatDialog v-model="beatOpen" :beat="beatEditing" />
    <QuestEditDialog v-model:show="questOpen" :quest-id="questEditingId" />
    <StoryClusterDialog v-model="clusterOpen" :cluster="clusterEditing" />
  </div>
</template>

<script setup lang="ts">
import { VueFlow, MarkerType, useVueFlow, type Connection, type EdgeMouseEvent, type NodeDragEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import dagre from '@dagrejs/dagre'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import StoryMapCard, { type MapCardItem } from './StoryMapCard.vue'
import StoryBeatDialog from './StoryBeatDialog.vue'
import StoryClusterDialog from './StoryClusterDialog.vue'
import QuestEditDialog from '~/components/quests/QuestEditDialog.vue'
import {
  storylineColor,
  BEAT_KIND_ICONS, MAP_NODE_KINDS, NO_COLOR, QUEST_STATUS_ICONS,
  type LinkedEntity, type MapEdgeKind, type MapNodeKind, type StoryBeat, type StoryCluster, type StoryMapNode,
} from '~~/types/story'

/**
 * Story map: quests, clusters and beats as cards on a free canvas, joined by
 * "leads to" arrows (optionally labelled with a condition). Arrange lays them
 * out left to right along the arrows.
 */
const { t } = useI18n()
const store = useStoryBoardStore()
const tabs = useEntityTabsStore()
const { fitView, screenToFlowCoordinate, getNodes, vueFlowRef } = useVueFlow('story-map')

// --- what each card shows ------------------------------------------------
const lineColor = (id: number | null | undefined) => {
  const l = id ? store.storylines.find(s => s.id === id) : null
  return l ? storylineColor(l) : NO_COLOR
}
const clusterOf = (id: number | null) => (id ? store.clusters.find(c => c.id === id) ?? null : null)

function describe(kind: MapNodeKind, refId: number): (MapCardItem & { storylineId: number | null }) | null {
  if (kind === 'quest') {
    const q = store.quests.find(x => x.id === refId)
    if (!q) return null
    const givers = q.giver_hidden ? [t('quests.giverHiddenShort')] : q.givers.map(g => g.name)
    return {
      kind, title: q.name, icon: QUEST_STATUS_ICONS[q.status], color: lineColor(q.storyline_id), storylineId: q.storyline_id,
      chips: [t(`quests.statuses.${q.status}`), ...givers, ...(q.optional ? [t('quests.optional')] : [])],
      optional: !!q.optional, minor: q.importance === 'minor', done: q.status === 'completed' || q.status === 'failed',
      details: q.description, beats: [], links: [], inTray: null,
    }
  }
  if (kind === 'cluster') {
    const c = store.clusters.find(x => x.id === refId)
    if (!c) return null
    const beats = store.beatsOf(c.id)
    return {
      kind, title: c.title, icon: 'mdi-vector-square', color: lineColor(c.storyline_id), storylineId: c.storyline_id,
      chips: [t('story.map.beatCount', { done: beats.filter(b => b.status === 'played').length, total: beats.length }), t(`story.heat.${c.heat}`)],
      optional: false, minor: false, done: c.status === 'resolved',
      details: c.notes,
      beats: beats.map(x => ({ id: x.id, title: x.title, done: x.status === 'played' || x.status === 'cut', inTray: x.tray_order != null, body: x.body, links: [...placeLink(x.location_id, x.location_name), ...x.entities] })),
      links: placeLink(c.location_id, c.location_name),
      inTray: beats.some(x => x.tray_order != null),
    }
  }
  const b = store.beats.find(x => x.id === refId)
  if (!b) return null
  const c = clusterOf(b.cluster_id)
  return {
    kind, title: b.title, icon: BEAT_KIND_ICONS[b.kind], color: lineColor(c?.storyline_id), storylineId: c?.storyline_id ?? null,
    chips: [c ? c.title : t('story.sparks.title'), t(`story.beatStatus.${b.status}`)],
    optional: false, minor: false, done: b.status === 'played' || b.status === 'cut',
    details: b.body, beats: [],
    links: [...placeLink(b.location_id, b.location_name), ...b.entities],
    inTray: b.tray_order != null,
  }
}
/** Where it happens, as a clickable link (if it has a place) */
function placeLink(id: number | null, name: string | null): LinkedEntity[] {
  return id && name ? [{ id, name, type: 'Location' }] : []
}

// --- acts ------------------------------------------------------------------
const actNames = computed(() => store.settings.acts ?? [1, 2, 3].map(n => t('story.map.actN', { n })))
const viewAct = ref(0) // 0 = all acts
watch(actNames, (names) => {
  if (viewAct.value > names.length) viewAct.value = 0
})
const actsOpen = ref(false)
const actsDraft = ref<string[]>([])
function openActs() {
  actsDraft.value = [...actNames.value]
  actsOpen.value = true
}
async function saveActs() {
  const names = actsDraft.value.map(a => a.trim()).filter(Boolean)
  await store.saveSettings({ acts: names.length ? names : null })
  actsOpen.value = false
}

// --- next session ------------------------------------------------------------
/** A card's calendar button: a cluster goes into the tray whole; a beat on its own */
async function toggleCardNext(kind: MapNodeKind, refId: number, inTray: boolean | null) {
  if (kind === 'cluster') await store.clusterToTray(refId, !inTray)
  else if (kind === 'beat') await store.updateBeat(refId, { in_tray: !inTray })
}

// Only the beats in the next-session tray, plus the "what if" branches hanging off
// them (follow the lines out of the tray through beats that haven't happened yet).
const nextOnly = ref(false)
function toggleNext() {
  nextOnly.value = !nextOnly.value
  nextTick(() => fitView({ padding: 0.2 }))
}
const nextSessionNodeIds = computed(() => {
  const beatOf = (nodeId: number) => {
    const n = store.map.nodes.find(x => x.id === nodeId)
    return n?.kind === 'beat' ? store.beats.find(b => b.id === n.ref_id) : undefined
  }
  // Beats in the tray, and clusters with any beat in it
  const clusterInTray = (nodeId: number) => {
    const n = store.map.nodes.find(x => x.id === nodeId)
    return n?.kind === 'cluster' && store.beatsOf(n.ref_id).some(b => b.tray_order != null)
  }
  const keep = new Set(store.map.nodes.filter(n => beatOf(n.id)?.tray_order != null || clusterInTray(n.id)).map(n => n.id))
  const queue = [...keep]
  while (queue.length) {
    const from = queue.shift()!
    for (const e of store.map.edges) {
      if (e.from_node !== from || keep.has(e.to_node)) continue
      const b = beatOf(e.to_node)
      if (b && b.status !== 'played' && b.status !== 'cut') {
        keep.add(e.to_node)
        queue.push(e.to_node)
      }
    }
  }
  return keep
})

const visibleMapNodes = computed(() => store.map.nodes.filter(n =>
  nextOnly.value ? nextSessionNodeIds.value.has(n.id) : (!viewAct.value || n.act === viewAct.value),
))
const flowNodes = computed(() => visibleMapNodes.value.flatMap((n: StoryMapNode) => {
  const item = describe(n.kind, n.ref_id)
  return item ? [{ id: `n${n.id}`, type: 'story', position: { x: n.x, y: n.y }, data: { item, mapId: n.id, kind: n.kind, refId: n.ref_id, act: n.act, storylineId: item.storylineId } }] : []
}))
const shownIds = computed(() => new Set(flowNodes.value.map(n => n.id)))
const flowEdges = computed(() => store.map.edges
  .filter(e => shownIds.value.has(`n${e.from_node}`) && shownIds.value.has(`n${e.to_node}`))
  .map(e => ({
    id: `e${e.id}`,
    source: `n${e.from_node}`,
    target: `n${e.to_node}`,
    label: e.label ?? undefined,
    type: 'smoothstep',
    // Related = dotted, no arrowhead: connected, in any order
    markerEnd: e.kind === 'related' ? undefined : MarkerType.ArrowClosed,
    class: e.kind === 'related' ? 'edge-related' : undefined,
    data: { mapId: e.id },
  })))

// Storyline filter: other cards fade out, arrows stay readable
const storylineFilter = ref<number[]>([])
function toggleStoryline(id: number) {
  storylineFilter.value = storylineFilter.value.includes(id) ? storylineFilter.value.filter(x => x !== id) : [...storylineFilter.value, id]
}
const isDim = (storylineId: number | null) => storylineFilter.value.length > 0 && !(storylineId && storylineFilter.value.includes(storylineId))

// --- room for the map: fold the list and the main menu ---------------------
const SIDE_KEY = 'dmhero.storyMap.sideOpen'
const sideOpen = ref(true)
const navRail = useState<boolean>('navRail', () => false)
onMounted(() => {
  try {
    sideOpen.value = localStorage.getItem(SIDE_KEY) !== 'false'
  }
  catch {
    // storage blocked — stays open
  }
})
function refit() {
  // after the panels finish sliding
  setTimeout(() => fitView({ padding: 0.2 }), 250)
}
function setSide(open: boolean) {
  sideOpen.value = open
  try {
    localStorage.setItem(SIDE_KEY, String(open))
  }
  catch {
    // storage blocked — works for this visit
  }
  refit()
}
const bigMap = computed(() => !sideOpen.value && navRail.value)
function toggleBigMap() {
  const big = !bigMap.value
  navRail.value = big
  setSide(!big)
}

// --- side list -----------------------------------------------------------
const sideKind = ref<MapNodeKind>('quest')
const sideSearch = ref('')
const placed = computed(() => new Set(store.map.nodes.map(n => `${n.kind}-${n.ref_id}`)))
const sideItems = computed(() => {
  const q = (sideSearch.value ?? '').toLowerCase().trim()
  const all = sideKind.value === 'quest'
    ? store.quests.map(x => ({ kind: 'quest' as const, id: x.id, title: x.name, sub: t(`quests.statuses.${x.status}`), icon: 'mdi-script-text', color: lineColor(x.storyline_id) }))
    : sideKind.value === 'cluster'
      ? store.clusters.map(x => ({ kind: 'cluster' as const, id: x.id, title: x.title, sub: store.storylines.find(s => s.id === x.storyline_id)?.name ?? '', icon: 'mdi-vector-square', color: lineColor(x.storyline_id) }))
      : store.beats.map((x) => {
          const c = clusterOf(x.cluster_id)
          return { kind: 'beat' as const, id: x.id, title: x.title, sub: c?.title ?? t('story.sparks.title'), icon: BEAT_KIND_ICONS[x.kind], color: lineColor(c?.storyline_id) }
        })
  return all.filter(x => !placed.value.has(`${x.kind}-${x.id}`) && (!q || x.title.toLowerCase().includes(q) || x.sub.toLowerCase().includes(q)))
})

function onDragStart(e: DragEvent, kind: MapNodeKind, id: number) {
  e.dataTransfer?.setData('application/x-story-map', JSON.stringify({ kind, id }))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
async function onDrop(e: DragEvent) {
  const raw = e.dataTransfer?.getData('application/x-story-map')
  if (!raw) return
  const { kind, id } = JSON.parse(raw) as { kind: MapNodeKind, id: number }
  const p = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
  await store.addMapNode(kind, id, p.x - 100, p.y - 30, viewAct.value || null)
}
async function addAtCenter(kind: MapNodeKind, id: number) {
  const box = vueFlowRef.value?.getBoundingClientRect()
  const p = box ? screenToFlowCoordinate({ x: box.left + box.width / 2, y: box.top + box.height / 2 }) : { x: 0, y: 0 }
  // Nudge so several quick adds don't stack exactly
  const n = store.map.nodes.length % 6
  await store.addMapNode(kind, id, p.x - 100 + n * 20, p.y - 30 + n * 20, viewAct.value || null)
}

// --- moving, connecting --------------------------------------------------
const mapId = (flowId: string) => Number(flowId.slice(1))

function onDragStop(e: NodeDragEvent) {
  const moved = e.nodes.length ? e.nodes : [e.node]
  if (moved.length === 1) store.moveMapNode(mapId(moved[0]!.id), moved[0]!.position.x, moved[0]!.position.y)
  else store.saveMapPositions(moved.map(n => ({ id: mapId(n.id), x: n.position.x, y: n.position.y })))
}

function onConnect(c: Connection) {
  if (c.source && c.target && c.source !== c.target) store.addMapEdge(mapId(c.source), mapId(c.target))
}

/** Left to right along the arrows; on "All" each act gets its own block, in act order. */
async function arrange() {
  const nodes = getNodes.value
  const actOf = (flowId: string) => store.map.nodes.find(n => n.id === mapId(flowId))?.act ?? null
  const groups = [...new Set(nodes.map(n => actOf(n.id)))].sort((a, b) => (a ?? 999) - (b ?? 999))
  const positions: { id: number, x: number, y: number }[] = []
  let offsetX = 0
  for (const act of groups) {
    const inAct = nodes.filter(n => actOf(n.id) === act)
    const ids = new Set(inAct.map(n => n.id))
    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: 90 })
    g.setDefaultEdgeLabel(() => ({}))
    for (const n of inAct) g.setNode(n.id, { width: n.dimensions.width || 220, height: n.dimensions.height || 90 })
    for (const e of flowEdges.value) if (e.class !== 'edge-related' && ids.has(e.source) && ids.has(e.target)) g.setEdge(e.source, e.target)
    dagre.layout(g)
    let right = 0
    for (const n of inAct) {
      const p = g.node(n.id)
      const w = n.dimensions.width || 220
      const x = offsetX + p.x - w / 2
      right = Math.max(right, x + w)
      positions.push({ id: mapId(n.id), x: Math.round(x), y: Math.round(p.y - (n.dimensions.height || 90) / 2) })
    }
    offsetX = right + 160
  }
  await store.saveMapPositions(positions)
  await nextTick()
  fitView({ padding: 0.2 })
}

// --- arrows: label or remove ----------------------------------------------
const edgeOpen = ref(false)
const edgeId = ref<number | null>(null)
const edgeLabel = ref('')
const edgeFromTo = ref('')
const edgeKind = ref<MapEdgeKind>('leads')
function onEdgeClick({ edge }: EdgeMouseEvent) {
  const e = store.map.edges.find(x => x.id === mapId(edge.id))
  if (!e) return
  const name = (id: number) => {
    const n = store.map.nodes.find(x => x.id === id)
    return n ? describe(n.kind, n.ref_id)?.title ?? '?' : '?'
  }
  edgeId.value = e.id
  edgeLabel.value = e.label ?? ''
  edgeKind.value = e.kind
  edgeFromTo.value = `${name(e.from_node)} → ${name(e.to_node)}`
  edgeOpen.value = true
}
async function saveEdge() {
  if (edgeId.value) await store.updateMapEdge(edgeId.value, { label: edgeLabel.value.trim() || null, kind: edgeKind.value })
  edgeOpen.value = false
}
async function deleteEdge() {
  if (edgeId.value) await store.removeMapEdge(edgeId.value)
  edgeOpen.value = false
}

// --- opening what a card stands for ---------------------------------------
const beatOpen = ref(false)
const beatEditing = ref<StoryBeat | null>(null)
const clusterOpen = ref(false)
const clusterEditing = ref<StoryCluster | null>(null)
const questOpen = ref(false)
const questEditingId = ref<number | null>(null)
/** Quest title → its full details in the side panel (clusters and beats unfold on the card) */
function openItem(kind: MapNodeKind, refId: number) {
  const q = kind === 'quest' ? store.quests.find(x => x.id === refId) : null
  if (q) tabs.open('quest', q.id, q.name)
}
function editItem(kind: MapNodeKind, refId: number) {
  if (kind === 'quest') {
    questEditingId.value = refId
    questOpen.value = true
  }
  else if (kind === 'cluster') {
    clusterEditing.value = store.clusters.find(x => x.id === refId) ?? null
    clusterOpen.value = !!clusterEditing.value
  }
  else {
    beatEditing.value = store.beats.find(x => x.id === refId) ?? null
    beatOpen.value = !!beatEditing.value
  }
}
</script>

<style scoped>
.map-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 12px;
  container-type: inline-size;
}
.map-layout--side-closed {
  grid-template-columns: 40px minmax(0, 1fr);
}
@container (max-width: 700px) {
  .map-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
.map-side-strip {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 8px;
}
.map-side {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 220px);
  min-height: 420px;
}
.map-side__list {
  overflow-y: auto;
  flex: 1;
  padding: 0 8px 8px;
}
.map-side__item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: grab;
}
.map-side__item:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.min-w-0 {
  min-width: 0;
}
.map-canvas {
  position: relative;
  height: calc(100vh - 260px);
  min-height: 480px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 8px;
  overflow: hidden;
  background: rgb(var(--v-theme-background));
}
.map-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  opacity: 0.7;
  pointer-events: none;
}
/* Vue Flow in the app's colors */
.map-canvas :deep(.vue-flow__node-story) {
  padding: 0;
  border: 0;
  background: transparent;
}
.map-canvas :deep(.vue-flow__edge-path) {
  stroke: rgba(var(--v-theme-on-surface), 0.55);
  stroke-width: 2;
}
.map-canvas :deep(.vue-flow__edge.selected .vue-flow__edge-path),
.map-canvas :deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  stroke: rgb(var(--v-theme-primary));
}
.map-canvas :deep(.vue-flow__arrowhead polyline) {
  stroke: rgba(var(--v-theme-on-surface), 0.55);
  fill: rgba(var(--v-theme-on-surface), 0.55);
}
.map-canvas :deep(.vue-flow__edge-textbg) {
  fill: rgb(var(--v-theme-surface));
}
.map-canvas :deep(.vue-flow__edge-text) {
  fill: rgb(var(--v-theme-on-surface));
  font-size: 12px;
}
.map-canvas :deep(.vue-flow__controls-button) {
  background: rgb(var(--v-theme-surface));
  border-color: rgba(var(--v-theme-on-surface), 0.15);
  fill: rgb(var(--v-theme-on-surface));
}
.map-canvas :deep(.vue-flow__edge.edge-related .vue-flow__edge-path) {
  stroke-dasharray: 6 6;
}
.map-canvas :deep(.vue-flow__connection-path) {
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 2;
}
</style>
