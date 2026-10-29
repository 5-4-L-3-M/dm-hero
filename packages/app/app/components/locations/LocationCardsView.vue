<template>
  <div>
    <!-- Breadcrumb trail: where you are in the location tree -->
    <div v-if="!matches" class="d-flex align-center flex-wrap ga-1 mb-3 location-cards__trail">
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-home-map-marker"
        :class="{ 'text-medium-emphasis': parentId !== null }"
        class="text-none"
        @click="$emit('update:parentId', null)"
      >
        {{ $t('locations.view.allLocations') }}
      </v-btn>
      <template v-for="crumb in trail" :key="crumb.id">
        <v-icon size="small" class="text-medium-emphasis">mdi-chevron-right</v-icon>
        <v-btn
          variant="text"
          size="small"
          class="text-none"
          :class="{ 'text-medium-emphasis': crumb.id !== parentId }"
          @click="$emit('update:parentId', crumb.id)"
        >
          {{ crumb.name }}
        </v-btn>
      </template>
    </div>

    <!-- The place you're inside: its own actions -->
    <v-card v-if="!matches && current" variant="tonal" class="d-flex align-center pa-3 mb-4">
      <v-avatar size="48" rounded class="mr-3" :color="current.image_url ? undefined : typeColor(current)">
        <v-img v-if="current.image_url" :src="`/uploads/${current.image_url}`" cover />
        <v-icon v-else color="white">{{ typeIcon(current) }}</v-icon>
      </v-avatar>
      <div class="flex-grow-1" style="min-width: 0">
        <div class="text-title-large text-truncate">{{ current.name }}</div>
        <div class="text-body-small text-medium-emphasis">
          <template v-if="current.metadata?.type">{{ typeLabel(current) }} · </template>
          {{ $t('locations.view.inside', { count: childrenOf(current.id).length }) }}
        </div>
      </div>
      <v-btn icon="mdi-eye" size="small" variant="text" @click="$emit('open', current)">
        <v-icon>mdi-eye</v-icon>
        <v-tooltip activator="parent" location="bottom">{{ $t('entityTabs.openAsTab') }}</v-tooltip>
      </v-btn>
      <LocationActionsMenu
        :location="current"
        @edit="$emit('edit', $event)"
        @graph="$emit('graph', $event)"
        @archive="$emit('archive', $event)"
        @delete="$emit('delete', $event)"
      />
    </v-card>

    <div v-if="matches" class="text-body-medium text-medium-emphasis mb-3">
      {{ $t('locations.view.results', { count: matches.length }) }}
    </div>

    <div v-if="cards.length > 0" class="location-cards__grid">
      <v-card
        v-for="loc in cards"
        :id="`location-${loc.id}`"
        :key="loc.id"
        class="location-card d-flex flex-column"
        :class="{ 'location-card--highlight': highlightedId === loc.id }"
        :style="{ opacity: loc.archived_at ? 0.55 : 1 }"
        @click="onCardClick(loc)"
        @contextmenu.prevent="$emit('contextmenu', $event, loc)"
      >
        <div class="location-card__media">
          <v-img v-if="loc.image_url" :src="`/uploads/${loc.image_url}`" height="120" cover />
          <div v-else class="location-card__placeholder" :style="{ background: placeholderBg(loc) }">
            <v-icon size="44" :color="typeColor(loc)">{{ typeIcon(loc) }}</v-icon>
          </div>
          <v-chip
            v-if="childrenOf(loc.id).length > 0"
            size="small"
            variant="flat"
            color="surface"
            class="location-card__inside"
            append-icon="mdi-chevron-right"
          >
            {{ $t('locations.view.inside', { count: childrenOf(loc.id).length }) }}
          </v-chip>
        </div>

        <div class="pa-3 pb-1 flex-grow-1">
          <div class="text-title-medium location-card__name">
            {{ loc.name }}
            <v-chip v-if="loc.archived_at" size="x-small" color="warning" variant="tonal" class="ml-1">
              {{ $t('common.archived') }}
            </v-chip>
          </div>
          <div v-if="matches && pathOf(loc)" class="text-body-small text-medium-emphasis text-truncate">
            {{ pathOf(loc) }}
          </div>
          <div class="d-flex align-center flex-wrap ga-1 mt-2">
            <v-chip v-if="loc.metadata?.type" size="x-small" color="primary" variant="tonal">
              {{ typeLabel(loc) }}
            </v-chip>
            <SharedTagPinner :entity-id="loc.id" @click.stop />
          </div>
        </div>

        <div class="d-flex align-center px-1 pb-1">
          <v-btn
            v-if="matches && childrenOf(loc.id).length > 0"
            size="small"
            variant="text"
            prepend-icon="mdi-folder-open-outline"
            class="text-none"
            @click.stop="$emit('browse', loc.id)"
          >
            {{ $t('locations.view.browseInside') }}
          </v-btn>
          <v-spacer />
          <v-btn icon="mdi-eye" size="small" variant="text" @click.stop="$emit('open', loc)">
            <v-icon>mdi-eye</v-icon>
            <v-tooltip activator="parent" location="bottom">{{ $t('entityTabs.openAsTab') }}</v-tooltip>
          </v-btn>
          <LocationActionsMenu
            :location="loc"
            @edit="$emit('edit', $event)"
            @graph="$emit('graph', $event)"
            @archive="$emit('archive', $event)"
            @delete="$emit('delete', $event)"
          />
        </div>
      </v-card>
    </div>

    <div v-else class="text-center text-medium-emphasis py-12">
      <v-icon size="48" class="mb-2">mdi-map-marker-off-outline</v-icon>
      <div>{{ matches ? $t('common.noResults') : $t('locations.view.nothingInside') }}</div>
    </div>
  </div>
</template>

<script lang="ts">
</script>

<script setup lang="ts" generic="L extends LocationCardItem">
import LocationActionsMenu from './LocationActionsMenu.vue'

export interface LocationCardItem {
  id: number
  name: string
  image_url?: string | null
  parent_entity_id?: number | null
  metadata: { type?: string } | null
  archived_at?: string | null
}

/**
 * Drill-down card view of the location tree: one level at a time with a
 * breadcrumb trail. Clicking a place with sub-places goes inside it; clicking
 * one without opens it as a tab. When searching or filtering, shows the
 * matches as a flat grid with their path.
 */

const props = defineProps<{
  /** Every location (tree source) */
  locations: L[]
  /** Flat matches while searching / filtering by type; null = browse the tree */
  matches: L[] | null
  /** Place whose sub-places are shown (null = top level) */
  parentId: number | null
  highlightedId?: number | null
}>()

const emit = defineEmits<{
  'update:parentId': [id: number | null]
  'open': [location: L]
  'browse': [id: number]
  'edit': [location: L]
  'graph': [location: L]
  'archive': [location: L]
  'delete': [location: L]
  'contextmenu': [event: MouseEvent, location: L]
}>()

const { t, te } = useI18n()
const { getLocationTypeIcon, getLocationTypeColor } = useEntityIcons()

const byId = computed(() => new Map(props.locations.map(l => [l.id, l])))
const childrenMap = computed(() => {
  const map = new Map<number | null, L[]>()
  for (const loc of props.locations) {
    // A parent that isn't in the list (archived/hidden) → show at top level
    const parent = loc.parent_entity_id && byId.value.has(loc.parent_entity_id) ? loc.parent_entity_id : null
    const list = map.get(parent) ?? []
    list.push(loc)
    map.set(parent, list)
  }
  return map
})

function childrenOf(id: number | null): L[] {
  return childrenMap.value.get(id) ?? []
}

const current = computed(() => (props.parentId !== null ? byId.value.get(props.parentId) ?? null : null))

/** Ancestors of the current place, top-most first, ending with the current place */
const trail = computed(() => {
  const out: L[] = []
  let node = current.value
  const seen = new Set<number>()
  while (node && !seen.has(node.id)) {
    seen.add(node.id)
    out.unshift(node)
    node = node.parent_entity_id ? byId.value.get(node.parent_entity_id) ?? null : null
  }
  return out
})

// If the place we were inside disappears (deleted, archived), step back to the top
watch(current, (c) => {
  if (props.parentId !== null && !c) emit('update:parentId', null)
})

const cards = computed(() => {
  if (props.matches) return props.matches
  // Places with sub-places first, then alphabetical
  return [...childrenOf(props.parentId)].sort((a, b) => {
    const ac = childrenOf(a.id).length > 0 ? 0 : 1
    const bc = childrenOf(b.id).length > 0 ? 0 : 1
    return ac - bc || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
})

function pathOf(loc: L): string {
  const names: string[] = []
  let parentId = loc.parent_entity_id ?? null
  const seen = new Set<number>()
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId)
    const p = byId.value.get(parentId)
    if (!p) break
    names.unshift(p.name)
    parentId = p.parent_entity_id ?? null
  }
  return names.join(' › ')
}

function onCardClick(loc: L) {
  if (!props.matches && childrenOf(loc.id).length > 0) emit('update:parentId', loc.id)
  else emit('open', loc)
}

function typeIcon(loc: L) {
  return getLocationTypeIcon(loc.metadata?.type)
}
function typeColor(loc: L) {
  return getLocationTypeColor(loc.metadata?.type)
}
function typeLabel(loc: L) {
  const type = loc.metadata?.type ?? ''
  const key = `locations.types.${type}`
  return te(key) ? t(key) : type
}
function placeholderBg(loc: L) {
  const c = typeColor(loc)
  // Theme colour names (e.g. "primary") → theme variable; hex/css colours as-is
  const css = /^#|^rgb|^hsl/.test(c) ? c : `rgb(var(--v-theme-${c}, var(--v-theme-primary)))`
  return `color-mix(in srgb, ${css} 16%, transparent)`
}
</script>

<style scoped>
.location-cards__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.location-card {
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.location-card:hover {
  transform: translateY(-2px);
}
.location-card--highlight {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.location-card__media {
  position: relative;
}
.location-card__placeholder {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.location-card__inside {
  position: absolute;
  right: 8px;
  bottom: 8px;
}
.location-card__name {
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.location-cards__trail :deep(.v-btn) {
  letter-spacing: normal;
}
</style>
