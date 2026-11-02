<template>
  <div
    class="map-card"
    :class="[`map-card--${item.kind}`, { 'map-card--optional': item.optional, 'map-card--minor': item.minor, 'map-card--done': item.done, 'map-card--dim': dim }]"
    :style="{ '--card-color': colorCss(item.color) }"
  >
    <Handle type="target" :position="Position.Left" class="map-handle" />
    <div class="map-card__head">
      <v-icon size="small" class="mr-1 flex-shrink-0">{{ item.icon }}</v-icon>
      <span class="map-card__kind">{{ $t(`story.map.kinds.${item.kind}`) }}</span>
      <v-spacer />
      <v-menu>
        <template #activator="{ props: menu }">
          <button v-bind="menu" type="button" class="map-card__act nodrag" :class="{ 'map-card__act--none': !act }">
            {{ act ? acts[act - 1] ?? `#${act}` : $t('story.map.noAct') }}
          </button>
        </template>
        <v-list density="compact">
          <v-list-item v-for="(name, i) in acts" :key="i" :title="name" :active="act === i + 1" @click="$emit('set-act', i + 1)" />
          <v-list-item :title="$t('story.map.noAct')" :active="!act" @click="$emit('set-act', null)" />
        </v-list>
      </v-menu>
      <button
        v-if="item.inTray !== null"
        type="button"
        class="map-card__x nodrag"
        :class="{ 'map-card__x--on': item.inTray }"
        :title="item.inTray ? $t('story.map.outOfNext') : $t('story.map.intoNext')"
        @click.stop="$emit('toggle-next')"
      >
        <v-icon size="x-small">{{ item.inTray ? 'mdi-calendar-check' : 'mdi-calendar-plus' }}</v-icon>
      </button>
      <button type="button" class="map-card__x nodrag" :title="$t('common.edit')" @click.stop="$emit('edit')">
        <v-icon size="x-small">mdi-pencil</v-icon>
      </button>
      <button type="button" class="map-card__x nodrag" :title="$t('story.map.removeCard')" @click.stop="$emit('remove')">
        <v-icon size="x-small">mdi-close</v-icon>
      </button>
    </div>
    <div class="map-card__title nodrag" role="button" tabindex="0" @click.stop="titleClick" @keydown.enter="titleClick">
      <v-icon v-if="item.kind !== 'quest'" size="x-small" class="mr-1">{{ open ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>{{ item.title }}
    </div>
    <!-- Details: unfold with a click on the title (quests open in the side panel instead) -->
    <div v-if="open" class="map-card__details nodrag nowheel">
      <SharedFormattedText v-if="item.details" :text="item.details" />
      <div v-else-if="!item.beats.length && !item.links.length" class="text-medium-emphasis">{{ $t('story.beat.noDetails') }}</div>
      <!-- A cluster's beats: click one to read it -->
      <div v-if="item.beats.length" class="map-card__beats">
        <div v-for="b in item.beats" :key="b.id" class="map-beat">
          <div class="map-beat__head" role="button" tabindex="0" @click.stop="toggleBeat(b.id)" @keydown.enter="toggleBeat(b.id)">
            <v-icon size="x-small" class="mr-1">{{ b.done ? 'mdi-check-circle' : b.inTray ? 'mdi-calendar-check' : 'mdi-circle-outline' }}</v-icon>
            <span :class="{ 'map-beat--done': b.done }">{{ b.title }}</span>
            <v-spacer />
            <v-icon v-if="b.body || b.links.length" size="x-small">{{ openBeats.has(b.id) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </div>
          <div v-if="openBeats.has(b.id)" class="map-beat__body">
            <SharedFormattedText v-if="b.body" :text="b.body" />
            <div v-if="b.links.length" class="map-card__links">
              <v-chip v-for="e in b.links" :key="`${e.type}-${e.id}`" size="x-small" variant="tonal" @click.stop>
                <SharedEntityLink :id="e.id" :type="e.type" :name="e.name" />
              </v-chip>
            </div>
            <button type="button" class="map-beat__edit" @click.stop="$emit('edit-beat', b.id)"><v-icon size="x-small">mdi-pencil</v-icon> {{ $t('common.edit') }}</button>
          </div>
        </div>
      </div>
      <!-- Linked people, places, items…: click one to open it in the side panel -->
      <div v-if="item.links.length" class="map-card__links">
        <v-chip v-for="e in item.links" :key="`${e.type}-${e.id}`" size="small" variant="tonal" @click.stop>
          <v-icon start size="small">{{ linkIcon(e.type) }}</v-icon>
          <SharedEntityLink :id="e.id" :type="e.type" :name="e.name" />
        </v-chip>
      </div>
    </div>
    <div v-if="item.chips.length" class="map-card__chips">
      <span v-for="c in item.chips" :key="c" class="map-card__chip">{{ c }}</span>
    </div>
    <Handle type="source" :position="Position.Right" class="map-handle map-handle--source" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { colorCss, type LinkedEntity, type MapNodeKind } from '~~/types/story'
import { ENTITY_PREVIEW_CONFIG } from '~/utils/entityPreview'
import { toPreviewType } from '~/stores/entityTabs'

/** One card on the story map: a quest, a cluster or a beat. Drag from the right dot to draw an arrow. */
export interface MapCardItem {
  kind: MapNodeKind
  title: string
  icon: string
  color: string
  chips: string[]
  optional: boolean
  minor: boolean
  done: boolean
  /** Text shown when unfolded (beat body, cluster notes) */
  details: string | null
  /** A cluster's beats, each readable on a click */
  beats: Array<{ id: number, title: string, done: boolean, inTray: boolean, body: string | null, links: LinkedEntity[] }>
  /** In the next-session tray (clusters: any of its beats); null = can't be (quests) */
  inTray: boolean | null
  /** Linked entries shown when unfolded (a beat's place, people, items…) */
  links: LinkedEntity[]
}
function linkIcon(type: string) {
  const t = toPreviewType(type)
  return t ? ENTITY_PREVIEW_CONFIG[t].icon : 'mdi-link'
}
const props = defineProps<{ item: MapCardItem, dim: boolean, act: number | null, acts: string[] }>()
const emit = defineEmits<{ 'open': [], 'edit': [], 'remove': [], 'set-act': [act: number | null], 'toggle-next': [], 'edit-beat': [id: number] }>()

const openBeats = ref(new Set<number>())
function toggleBeat(id: number) {
  const next = new Set(openBeats.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openBeats.value = next
}

const open = ref(false)
function titleClick() {
  if (props.item.kind === 'quest') emit('open')
  else open.value = !open.value
}
</script>

<style scoped>
.map-card {
  width: 260px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-left: 6px solid var(--card-color);
  border-radius: 8px;
  padding: 6px 10px 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  font-size: 0.95rem;
  transition: opacity 0.2s;
}
.map-card--quest {
  width: 300px;
  border-width: 2px 2px 2px 8px;
}
.map-card--quest .map-card__title {
  font-size: 1.1rem;
}
.map-card--beat {
  width: 250px;
  border-radius: 14px;
}
.map-card--minor {
  width: 240px;
}
.map-card--optional {
  border-style: dashed dashed dashed solid;
}
.map-card--done {
  opacity: 0.6;
}
.map-card--done .map-card__title {
  text-decoration: line-through;
}
.map-card--dim {
  opacity: 0.2;
}
.map-card__head {
  display: flex;
  align-items: center;
  opacity: 0.7;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.map-card__act {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 999px;
  background: none;
  color: inherit;
  font-size: 0.65rem;
  padding: 0 6px;
  margin-right: 4px;
  cursor: pointer;
  text-transform: none;
  letter-spacing: 0;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.map-card__act--none {
  border-style: dashed;
}
.map-card__x {
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  padding: 0 2px;
  opacity: 0.6;
}
.map-card__x:hover {
  opacity: 1;
}
.map-card__title {
  font-weight: 700;
  line-height: 1.3;
  margin-top: 2px;
  cursor: pointer;
}
.map-card__title:hover {
  text-decoration: underline;
}
.map-card__details {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.9rem;
  cursor: default;
  white-space: normal;
}
.map-card__x--on {
  opacity: 1;
  color: rgb(var(--v-theme-primary));
}
.map-card__beats {
  margin-top: 4px;
}
.map-beat__head {
  display: flex;
  align-items: flex-start;
  padding: 2px 4px;
  border-radius: 6px;
  cursor: pointer;
  line-height: 1.3;
}
.map-beat__head:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.map-beat--done {
  text-decoration: line-through;
  opacity: 0.7;
}
.map-beat__body {
  margin: 2px 0 6px 18px;
  padding-left: 8px;
  border-left: 2px solid var(--card-color);
  font-size: 0.85rem;
}
.map-beat__edit {
  border: 0;
  background: none;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
  font-size: 0.8rem;
  margin-top: 4px;
}
.map-card__links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
.map-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.map-card__chip {
  font-size: 0.78rem;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.map-handle {
  width: 12px;
  height: 12px;
  background: rgb(var(--v-theme-surface));
  border: 2px solid var(--card-color);
}
.map-handle--source {
  background: var(--card-color);
}
</style>
