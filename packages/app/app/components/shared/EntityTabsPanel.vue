<template>
  <v-navigation-drawer
    :model-value="tabs.panelOpen && tabs.count > 0"
    location="right"
    :width="tabs.wide ? 720 : 460"
    :temporary="mobile"
    :scrim="mobile"
    class="entity-tabs-panel"
    @update:model-value="tabs.setPanelOpen($event)"
  >
    <div class="d-flex flex-column fill-height">
      <!-- Tab strip -->
      <div class="d-flex align-center flex-shrink-0 entity-tabs-panel__strip">
        <v-tabs
          :model-value="tabs.activeKey"
          density="compact"
          show-arrows
          class="flex-grow-1"
          style="min-width: 0"
          @update:model-value="tabs.activate(String($event))"
        >
          <v-tab
            v-for="tab in tabs.tabs"
            :key="keyOf(tab)"
            :value="keyOf(tab)"
            class="entity-tabs-panel__tab text-none"
            @auxclick.middle.prevent="tabs.close(keyOf(tab))"
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
              @click.stop="tabs.close(keyOf(tab))"
            >
              mdi-close
            </v-icon>
          </v-tab>
        </v-tabs>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="small" />
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-close-box-multiple-outline" :title="$t('entityTabs.closeAll')" @click="tabs.closeAll()" />
            <v-list-item
              v-if="tabs.activeKey && tabs.count > 1"
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

      <!-- Active entry -->
      <template v-if="active">
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
import { entityTabKey, type EntityTab } from '~/stores/entityTabs'
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
const fullOpen = ref(false)
const viewOpen = ref(false)
const bodyRef = ref<{ reload: () => Promise<void> } | null>(null)

const keyOf = (tab: EntityTab) => entityTabKey(tab)

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
.entity-tabs-panel__strip {
  min-height: 48px;
}
.entity-tabs-panel__tab {
  max-width: 220px;
  padding-inline: 10px 2px !important;
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
