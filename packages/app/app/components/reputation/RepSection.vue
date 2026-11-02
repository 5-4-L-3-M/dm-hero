<template>
  <div class="rep-section">
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <!-- Met the party: one click -->
      <v-chip
        v-if="subject.type === 'NPC'"
        size="small"
        :color="met ? 'success' : undefined"
        :variant="met ? 'flat' : 'outlined'"
        :prepend-icon="met ? 'mdi-handshake' : 'mdi-account-question-outline'"
        @click="rep.setMet(subject.id, !met)"
      >
        {{ met ? $t('reputation.met') : $t('reputation.notMet') }}
      </v-chip>
      <v-spacer />
      <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="logOpen = true">{{ $t('reputation.log.short') }}</v-btn>
      <v-btn size="small" variant="text" prepend-icon="mdi-history" @click="historyOpen = true">{{ $t('reputation.history') }}</v-btn>
    </div>
    <div role="button" tabindex="0" class="rep-section__bars" @click="historyOpen = true" @keydown.enter="historyOpen = true">
      <RepBar
        v-for="tr in tracks"
        :key="`${tr.kind}-${tr.player_id}`"
        class="mb-2"
        :points="tr.points"
        :type="subject.type"
        :kind="tr.kind"
        :small="!!tr.player_id"
        :label="tr.player_name ?? (tr.kind === 'notoriety' ? $t('reputation.kinds.notoriety') : $t('reputation.party'))"
      />
    </div>
    <RepLogDialog v-model="logOpen" :subjects="[subject]" :subject-id="subject.id" />
    <RepHistoryDialog v-model="historyOpen" :subject="subject" />
  </div>
</template>

<script setup lang="ts">
import RepBar from './RepBar.vue'
import RepLogDialog from './RepLogDialog.vue'
import RepHistoryDialog from './RepHistoryDialog.vue'
import type { RepSubjectType } from '~~/types/reputation'

/** Reputation block for an NPC / faction / place (side panel, full view): bars, log, history, met. */
const props = defineProps<{ subject: { id: number, name: string, type: RepSubjectType } }>()

const rep = useReputationStore()
const campaignStore = useCampaignStore()
const story = useStoryBoardStore()
watch(() => campaignStore.activeCampaignIdNumber, (id) => {
  rep.load(id)
  story.load(id)
}, { immediate: true })

const met = computed(() => rep.isMet(props.subject.id))
const tracks = computed(() => {
  const list = [...rep.tracksOf(props.subject.id), ...rep.tracksOf(props.subject.id, 'notoriety')]
  return list.length ? list : [{ subject_id: props.subject.id, player_id: 0, player_name: null, kind: 'rep' as const, points: 0 }]
})
const logOpen = ref(false)
const historyOpen = ref(false)
</script>

<style scoped>
.rep-section__bars {
  cursor: pointer;
}
</style>
