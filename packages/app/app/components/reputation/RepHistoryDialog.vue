<template>
  <v-dialog :model-value="modelValue" max-width="620" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-history</v-icon>{{ subject.name }}
        <v-spacer />
        <v-btn size="small" color="primary" variant="flat" prepend-icon="mdi-plus" @click="logOpen = true">{{ $t('reputation.log.short') }}</v-btn>
      </v-card-title>
      <v-card-text>
        <!-- The bars: party first, then any split-off players -->
        <div v-for="tr in tracks" :key="`${tr.kind}-${tr.player_id}`" class="d-flex align-center ga-2 mb-2">
          <RepBar class="flex-grow-1" :points="tr.points" :type="subject.type" :kind="tr.kind" :label="tr.player_name ?? (tr.kind === 'notoriety' ? $t('reputation.kinds.notoriety') : $t('reputation.party'))" />
          <v-btn v-if="tr.player_id" icon="mdi-close" size="x-small" variant="text" :title="$t('reputation.removeSplit')" @click="rep.removeTrack(subject.id, tr.player_id, tr.kind)" />
        </div>
        <v-menu v-if="players.length">
          <template #activator="{ props: menu }">
            <v-btn v-bind="menu" size="small" variant="text" prepend-icon="mdi-call-split">{{ $t('reputation.split') }}</v-btn>
          </template>
          <v-list density="compact">
            <v-list-item v-for="p in players" :key="p.id" :title="p.name" @click="rep.addTrack(subject.id, p.id)" />
          </v-list>
        </v-menu>

        <v-divider class="my-3" />

        <!-- The log: green ups, red downs -->
        <div v-if="!events.length" class="text-body-medium text-medium-emphasis py-4 text-center">{{ $t('reputation.noHistory') }}</div>
        <div v-for="e in events" :key="e.id" class="log-row" :class="e.kind === 'notoriety' ? 'log-row--warn' : e.delta > 0 ? 'log-row--good' : 'log-row--bad'">
          <v-icon size="small" class="mr-2">{{ e.kind === 'notoriety' ? (e.delta > 0 ? 'mdi-shield-alert' : 'mdi-shield-check') : e.delta > 0 ? 'mdi-arrow-up-bold' : 'mdi-arrow-down-bold' }}</v-icon>
          <div class="flex-grow-1 min-w-0">
            <div class="font-weight-medium">
              {{ e.reason || (e.preset ? $t(`reputation.presets.${e.preset}.label`) : $t('reputation.change')) }}
            </div>
            <div class="text-body-small text-medium-emphasis">
              <span v-if="e.preset && e.reason">{{ $te(`reputation.presets.${e.preset}.label`) ? $t(`reputation.presets.${e.preset}.label`) : '' }} · </span>
              <span v-if="e.player_name">{{ e.player_name }} · </span>
              <span v-if="e.source_event_id">{{ $t('reputation.rippled') }} · </span>
              {{ e.session_label || formatWhen(e.created_at) }}
            </div>
          </div>
          <v-btn icon="mdi-delete-outline" size="x-small" variant="text" :title="$t('reputation.undo')" @click="remove(e.id)" />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>

    <RepLogDialog v-model="logOpen" :subjects="[subject]" :subject-id="subject.id" />
  </v-dialog>
</template>

<script setup lang="ts">
import RepBar from './RepBar.vue'
import RepLogDialog from './RepLogDialog.vue'
import type { RepEvent, RepSubjectType } from '~~/types/reputation'

/** One NPC / faction / place: its bars (party + split players) and the colour-coded history. */
const props = defineProps<{ modelValue: boolean, subject: { id: number, name: string, type: RepSubjectType } }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()

const rep = useReputationStore()
const story = useStoryBoardStore()
const players = computed(() => story.entities.filter(e => e.type === 'Player' && !rep.tracksOf(props.subject.id).some(t => t.player_id === e.id)))
const tracks = computed(() => {
  const list = [...rep.tracksOf(props.subject.id), ...rep.tracksOf(props.subject.id, 'notoriety')]
  return list.length ? list : [{ subject_id: props.subject.id, player_id: 0, player_name: null, kind: 'rep' as const, points: 0 }]
})
const events = ref<RepEvent[]>([])
const logOpen = ref(false)

async function loadEvents() {
  if (props.modelValue) events.value = await rep.events(props.subject.id).catch(() => [])
}
watch(() => [props.modelValue, props.subject.id, rep.version], loadEvents, { immediate: true })

async function remove(id: number) {
  await rep.removeEvent(id)
}
function formatWhen(iso: string) {
  return iso ? iso.slice(0, 10) : ''
}
</script>

<style scoped>
.log-row {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  margin-bottom: 6px;
  border-left: 4px solid transparent;
}
.log-row--good {
  background: rgba(var(--v-theme-success), 0.1);
  border-left-color: rgb(var(--v-theme-success));
}
.log-row--good .v-icon {
  color: rgb(var(--v-theme-success));
}
.log-row--bad {
  background: rgba(var(--v-theme-error), 0.1);
  border-left-color: rgb(var(--v-theme-error));
}
.log-row--bad .v-icon {
  color: rgb(var(--v-theme-error));
}
.log-row--warn {
  background: rgba(var(--v-theme-warning), 0.1);
  border-left-color: rgb(var(--v-theme-warning));
}
.min-w-0 {
  min-width: 0;
}
</style>
