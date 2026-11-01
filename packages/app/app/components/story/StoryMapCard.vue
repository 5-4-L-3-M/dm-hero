<template>
  <div
    class="map-card"
    :class="[`map-card--${item.kind}`, { 'map-card--optional': item.optional, 'map-card--minor': item.minor, 'map-card--done': item.done, 'map-card--dim': dim }]"
    :style="{ '--card-color': `rgb(var(--v-theme-${item.color}))` }"
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
      <button type="button" class="map-card__x nodrag" :title="$t('story.map.removeCard')" @click.stop="$emit('remove')">
        <v-icon size="x-small">mdi-close</v-icon>
      </button>
    </div>
    <div class="map-card__title nodrag" role="button" tabindex="0" @click.stop="$emit('open')" @keydown.enter="$emit('open')">
      {{ item.title }}
    </div>
    <div v-if="item.chips.length" class="map-card__chips">
      <span v-for="c in item.chips" :key="c" class="map-card__chip">{{ c }}</span>
    </div>
    <Handle type="source" :position="Position.Right" class="map-handle map-handle--source" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { MapNodeKind } from '~~/types/story'

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
}
defineProps<{ item: MapCardItem, dim: boolean, act: number | null, acts: string[] }>()
defineEmits<{ 'open': [], 'remove': [], 'set-act': [act: number | null] }>()
</script>

<style scoped>
.map-card {
  width: 210px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-left: 6px solid var(--card-color);
  border-radius: 8px;
  padding: 6px 10px 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  font-size: 0.85rem;
  transition: opacity 0.2s;
}
.map-card--quest {
  width: 240px;
  border-width: 2px 2px 2px 8px;
}
.map-card--quest .map-card__title {
  font-size: 1rem;
}
.map-card--beat {
  width: 190px;
  border-radius: 14px;
}
.map-card--minor {
  width: 190px;
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
.map-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.map-card__chip {
  font-size: 0.68rem;
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
