<template>
  <v-navigation-drawer
    :model-value="tabs.panelOpen"
    location="right"
    :width="tabs.panelWidth"
    :temporary="mobile"
    :scrim="mobile"
    class="entity-tabs-panel"
    @update:model-value="tabs.setPanelOpen($event)"
  >
    <!-- Drag the left edge to resize -->
    <div
      v-if="!mobile"
      class="entity-tabs-panel__resize"
      :class="{ 'entity-tabs-panel__resize--active': resizing }"
      role="separator"
      aria-orientation="vertical"
      :title="$t('entityTabs.resize')"
      @pointerdown.prevent="startResize"
      @dblclick="tabs.toggleWide()"
    />
    <div class="d-flex flex-column fill-height">
      <!-- Tab strip -->
      <div class="d-flex align-center flex-shrink-0 entity-tabs-panel__strip">
        <v-tabs
          :model-value="tabs.activeKey"
          density="compact"
          show-arrows
          class="flex-grow-1"
          style="min-width: 0"
          @update:model-value="onTabPicked"
        >
          <v-tab :value="REFERENCE_KEY" class="entity-tabs-panel__tab entity-tabs-panel__tab--pinned text-none">
            <v-icon size="small" start color="primary">mdi-book-open-variant</v-icon>
            <span class="entity-tabs-panel__tab-name">{{ $t('dmReference.title') }}</span>
          </v-tab>
          <v-tab
            v-for="tab in tabs.tabs"
            :key="keyOf(tab)"
            :value="keyOf(tab)"
            class="entity-tabs-panel__tab text-none"
            @auxclick.middle.prevent="closeTab(keyOf(tab))"
          >
            <v-icon size="small" start :color="ENTITY_PREVIEW_CONFIG[tab.type].color">
              {{ ENTITY_PREVIEW_CONFIG[tab.type].icon }}
            </v-icon>
            <span class="entity-tabs-panel__tab-name">{{ tab.name || '…' }}</span>
            <v-icon
              size="16"
              class="ml-1 entity-tabs-panel__close"
              role="button"
              :aria-label="$t('entityTabs.closeTab')"
              @mousedown.stop.prevent
              @pointerdown.stop
              @click.stop.prevent="closeTab(keyOf(tab))"
            >
              mdi-close
            </v-icon>
          </v-tab>
        </v-tabs>
        <v-btn icon="mdi-magnify" variant="text" size="small" :color="searchOpen ? 'primary' : undefined" @click="toggleSearch">
          <v-icon>mdi-magnify</v-icon>
          <v-tooltip activator="parent" location="bottom">{{ $t('entityTabs.search') }} (Ctrl+O)</v-tooltip>
        </v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="small" />
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-close-box-multiple-outline" :title="$t('entityTabs.closeAll')" @click="tabs.closeAll()" />
            <v-list-item
              v-if="tabs.activeKey && !showReference && tabs.count > 1"
              prepend-icon="mdi-close-box-outline"
              :title="$t('entityTabs.closeOthers')"
              @click="closeOthers"
            />
          </v-list>
        </v-menu>
        <v-btn
          :icon="tabs.wide ? 'mdi-arrow-collapse-right' : 'mdi-arrow-expand-left'"
          variant="text"
          size="small"
          @click="tabs.toggleWide()"
        >
          <v-icon>{{ tabs.wide ? 'mdi-arrow-collapse-right' : 'mdi-arrow-expand-left' }}</v-icon>
          <v-tooltip activator="parent" location="bottom">
            {{ tabs.wide ? $t('entityTabs.narrower') : $t('entityTabs.wider') }}
          </v-tooltip>
        </v-btn>
        <v-btn icon="mdi-chevron-right" variant="text" size="small" @click="tabs.setPanelOpen(false)">
          <v-icon>mdi-chevron-right</v-icon>
          <v-tooltip activator="parent" location="bottom">{{ $t('entityTabs.hide') }}</v-tooltip>
        </v-btn>
      </div>
      <v-divider />

      <!-- Quick open: type a name, pick it, it opens as a tab (Ctrl+O) -->
      <div v-if="searchOpen || (!tabs.count && !showReference)" class="px-3 pt-3 pb-2 flex-shrink-0">
        <v-autocomplete
          ref="searchRef"
          v-model:search="searchText"
          :model-value="null"
          :items="searchItems"
          item-title="name"
          item-value="key"
          :placeholder="$t('entityTabs.searchPlaceholder')"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          auto-select-first
          :custom-filter="searchFilter"
          :menu-props="{ maxHeight: 420 }"
          @update:model-value="openFromSearch"
          @keydown.esc="searchOpen = false"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :prepend-icon="ENTITY_PREVIEW_CONFIG[item.ptype].icon" :subtitle="$t(`entityTabs.types.${item.ptype}`)">
              <template #prepend>
                <v-icon :color="ENTITY_PREVIEW_CONFIG[item.ptype].color">{{ ENTITY_PREVIEW_CONFIG[item.ptype].icon }}</v-icon>
              </template>
            </v-list-item>
          </template>
        </v-autocomplete>
        <div v-if="!tabs.count && !showReference" class="text-body-small text-medium-emphasis mt-3">{{ $t('entityTabs.emptyHint') }}</div>
      </div>

      <!-- DM Screen (pinned) -->
      <SharedDmReferencePanel v-if="showReference" class="flex-grow-1" style="min-height: 0" />

      <!-- Active entry -->
      <template v-else-if="active">
        <div class="d-flex align-center px-4 pt-3 pb-1 flex-shrink-0">
          <v-icon :icon="ENTITY_PREVIEW_CONFIG[active.type].icon" :color="ENTITY_PREVIEW_CONFIG[active.type].color" class="mr-2" />
          <div class="text-title-large font-weight-medium text-truncate flex-grow-1">{{ active.name }}</div>
          <SharedPinButton :entity-id="active.id" variant="icon" size="small" />
        </div>
        <div class="d-flex flex-wrap ga-2 px-4 pb-2 flex-shrink-0">
          <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-arrow-expand" @click="viewOpen = true">
            {{ $t('preview.openFull') }}
          </v-btn>
          <v-btn size="small" variant="text" prepend-icon="mdi-pencil" @click="fullOpen = true">
            {{ $t('preview.edit') }}
          </v-btn>
          <v-btn size="small" variant="text" prepend-icon="mdi-open-in-new" @click="goToPage">
            {{ $t('sessions.goToPage') }}
          </v-btn>
        </div>
        <v-divider />
        <div class="flex-grow-1 overflow-y-auto pa-4">
          <SharedEntityPreviewBody
            ref="bodyRef"
            :key="keyOf(active)"
            :entity-type="active.type"
            :entity-id="active.id"
            @loaded="onLoaded"
            @open="(type, id, name) => tabs.open(type, id, name)"
          />
        </div>
      </template>
    </div>
  </v-navigation-drawer>

  <!-- Full page to read (every section, roomy) -->
  <SharedEntityFullView
    v-if="active"
    v-model="viewOpen"
    :entity-type="active.type"
    :entity-id="active.id"
    :entity-name="active.name"
  />

  <!-- Editor (every tab) on top of whatever page is open -->
  <component
    :is="ENTITY_FULL_DIALOGS[active.type].component"
    v-if="active && fullOpen"
    v-model:show="fullOpen"
    v-bind="{ [ENTITY_FULL_DIALOGS[active.type].idProp]: active.id }"
    @saved="bodyRef?.reload()"
  />
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { ENTITY_FULL_DIALOGS, ENTITY_PREVIEW_CONFIG, entityPageLink } from '~/utils/entityPreview'
import { entityTabKey, toPreviewType, REFERENCE_KEY, type EntityTab } from '~/stores/entityTabs'
import type { PreviewEntity } from './EntityPreviewBody.vue'

/**
 * Entry tabs side panel: every entity opened with the eye button stays here as
 * a tab while you move around the app; click between them, close what you're
 * done with.
 */
const tabs = useEntityTabsStore()
const campaignStore = useCampaignStore()
const router = useRouter()
const { mobile } = useDisplay()

const active = computed(() => tabs.activeTab)
const showReference = computed(() => tabs.activeKey === REFERENCE_KEY)
const fullOpen = ref(false)
const viewOpen = ref(false)
const bodyRef = ref<{ reload: () => Promise<void> } | null>(null)

const keyOf = (tab: EntityTab) => entityTabKey(tab)

// Closing a tab must not switch to (or scroll to) another one: the tab strip
// re-picks a tab while it rearranges, so ignore its picks for a moment
let closingUntil = 0
function closeTab(key: string) {
  closingUntil = Date.now() + 400
  tabs.close(key)
}
function onTabPicked(key: unknown) {
  if (Date.now() < closingUntil) return
  tabs.activate(String(key))
}

// --- resizing: drag the left edge ----------------------------------------------
const resizing = ref(false)
function startResize(e: PointerEvent) {
  resizing.value = true
  const move = (ev: PointerEvent) => tabs.setWidth(window.innerWidth - ev.clientX, false)
  const up = () => {
    resizing.value = false
    tabs.setWidth(tabs.width)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  move(e)
}

// --- quick open (Ctrl+O, like Obsidian's quick switcher) -------------------------
const story = useStoryBoardStore()
const searchOpen = ref(false)
const searchText = ref('')
const searchRef = ref<{ focus: () => void } | null>(null)
const searchItems = computed(() => {
  const seen = new Set<string>()
  const all = [...story.entities, ...story.locations.map(l => ({ id: l.id, name: l.name, type: 'Location' }))]
  return all.flatMap((e) => {
    const ptype = toPreviewType(e.type)
    const key = ptype ? `${ptype}:${e.id}` : ''
    if (!ptype || seen.has(key)) return []
    seen.add(key)
    return [{ key, id: e.id, name: e.name, ptype }]
  }).sort((a, b) => a.name.localeCompare(b.name))
})
// Every word typed must appear in the name (so "fitch ver" finds Veruico Fitch)
function searchFilter(value: string, query: string) {
  const v = value.toLowerCase()
  return query.toLowerCase().split(/\s+/).filter(Boolean).every(w => v.includes(w))
}
async function focusSearch() {
  searchOpen.value = true
  story.load(campaignStore.activeCampaignIdNumber)
  await nextTick()
  searchRef.value?.focus()
}
function toggleSearch() {
  if (searchOpen.value) searchOpen.value = false
  else focusSearch()
}
function openFromSearch(key: string | null) {
  const item = searchItems.value.find(i => i.key === key)
  if (!item) return
  tabs.open(item.ptype, item.id, item.name)
  searchText.value = ''
  searchOpen.value = false
}
watch(() => tabs.searchRequest, () => focusSearch())

function onKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'o') {
    e.preventDefault()
    tabs.openSearch()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// Tabs are per campaign
watch(() => campaignStore.activeCampaignIdNumber, id => tabs.useCampaign(id ?? null), { immediate: true })

watch(() => tabs.activeKey, () => {
  fullOpen.value = false
  viewOpen.value = false
})

function onLoaded(entity: PreviewEntity | null) {
  if (entity && active.value) tabs.rename(active.value.type, active.value.id, entity.name)
}

function closeOthers() {
  const keep = tabs.activeKey
  for (const tab of [...tabs.tabs]) {
    if (keyOf(tab) !== keep) tabs.close(keyOf(tab))
  }
}

function goToPage() {
  if (!active.value) return
  router.push(entityPageLink(active.value.type, active.value.id, active.value.name))
}
</script>

<style scoped>
.entity-tabs-panel__resize {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 7px;
  cursor: col-resize;
  z-index: 10;
}
.entity-tabs-panel__resize:hover,
.entity-tabs-panel__resize--active {
  background: rgba(var(--v-theme-primary), 0.4);
}
.entity-tabs-panel__strip {
  min-height: 48px;
}
.entity-tabs-panel__tab {
  max-width: 220px;
  padding-inline: 10px 2px !important;
}
.entity-tabs-panel__tab--pinned {
  padding-inline: 10px !important;
}
.entity-tabs-panel__close {
  border-radius: 50%;
  opacity: 0.6;
}
.entity-tabs-panel__close:hover {
  opacity: 1;
  background: rgba(var(--v-theme-on-surface), 0.12);
}
.entity-tabs-panel__tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}
</style>
