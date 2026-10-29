<template>
  <v-container fluid class="story-page">
    <div v-if="!campaignId" class="text-center py-16">
      <v-icon icon="mdi-vector-square" size="64" class="mb-4" color="primary" />
      <h2 class="text-headline-large mb-4">{{ $t('story.noCampaign') }}</h2>
      <v-btn color="primary" size="large" to="/campaigns" prepend-icon="mdi-arrow-right">{{ $t('nav.chooseCampaign') }}</v-btn>
    </div>

    <template v-else>
      <div class="d-flex align-center flex-wrap ga-3 mb-3">
        <div>
          <div class="text-headline-large">
            <v-icon icon="mdi-vector-square" size="36" class="mr-2" />{{ $t('story.title') }}
          </div>
          <p class="text-body-large text-medium-emphasis">{{ $t('story.subtitle') }}</p>
        </div>
        <v-spacer />
        <v-tabs v-model="tab" color="primary" density="comfortable">
          <v-tab value="board" prepend-icon="mdi-view-dashboard-variant">{{ $t('story.tabs.board') }}</v-tab>
          <v-tab value="run" prepend-icon="mdi-format-list-numbered">
            {{ $t('story.tabs.run') }}
            <v-chip v-if="store.tray.length" size="x-small" color="primary" class="ml-2">{{ store.tray.length }}</v-chip>
          </v-tab>
          <v-tab value="world" prepend-icon="mdi-earth">{{ $t('story.tabs.world') }}</v-tab>
        </v-tabs>
      </div>

      <v-progress-linear v-if="store.loading && !store.board" indeterminate class="mb-3" />

      <template v-if="store.board">
        <StoryBoardTab v-if="tab === 'board'" @open-run-sheet="tab = 'run'" />
        <StoryRunSheet v-else-if="tab === 'run'" />
        <StoryWorldTab v-else :campaign-id="campaignId" />
      </template>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import StoryBoardTab from '~/components/story/StoryBoardTab.vue'
import StoryRunSheet from '~/components/story/StoryRunSheet.vue'
import StoryWorldTab from '~/components/story/StoryWorldTab.vue'

/** Story Board: plan with clusters and sparks, run the session from the tray, keep an eye on the world. */
const route = useRoute()
const router = useRouter()
const campaignStore = useCampaignStore()
const store = useStoryBoardStore()

const campaignId = computed(() => campaignStore.activeCampaignIdNumber)
const TABS = ['board', 'run', 'world'] as const
const tab = ref<typeof TABS[number]>((TABS as readonly string[]).includes(String(route.query.tab)) ? route.query.tab as typeof TABS[number] : 'board')
watch(tab, t => router.replace({ query: { ...route.query, tab: t === 'board' ? undefined : t } }))

watch(campaignId, id => store.load(id, true), { immediate: true })
</script>
