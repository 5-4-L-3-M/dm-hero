<template>
  <v-dialog :model-value="modelValue" max-width="620" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-scale-balance</v-icon>{{ $t('reputation.log.title') }}
      </v-card-title>
      <v-card-text>
        <!-- Who reacts -->
        <v-select
          v-if="subjects.length > 1"
          v-model="pickedId"
          :items="subjects"
          item-title="name"
          item-value="id"
          :label="$t('reputation.log.who')"
          variant="outlined"
          density="comfortable"
          class="mb-3"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :subtitle="$t(`reputation.types.${item.type}`)" />
          </template>
        </v-select>
        <div v-else-if="subject" class="text-title-medium mb-3">{{ subject.name }}</div>

        <!-- Reputation, or notoriety with a place's guard -->
        <v-btn-toggle v-if="subject?.type === 'Location'" v-model="logKind" mandatory density="compact" variant="outlined" divided class="mb-3">
          <v-btn value="rep" size="small"><v-icon start>mdi-heart-half-full</v-icon>{{ $t('reputation.kinds.rep') }}</v-btn>
          <v-btn value="notoriety" size="small"><v-icon start>mdi-shield-alert</v-icon>{{ $t('reputation.kinds.notoriety') }}</v-btn>
        </v-btn-toggle>

        <!-- Toward the whole party, or one player -->
        <div class="d-flex flex-wrap align-center ga-2 mb-3">
          <span class="text-body-small text-medium-emphasis">{{ $t('reputation.log.toward') }}</span>
          <v-chip :variant="playerId === 0 ? 'flat' : 'outlined'" color="primary" size="small" @click="playerId = 0">{{ $t('reputation.party') }}</v-chip>
          <v-chip v-for="p in players" :key="p.id" :variant="playerId === p.id ? 'flat' : 'outlined'" color="primary" size="small" @click="playerId = p.id">{{ p.name }}</v-chip>
        </div>

        <!-- What happened: presets, points stay hidden -->
        <div class="preset-grid mb-3">
          <button
            v-for="p in presets"
            :key="p.key"
            type="button"
            class="preset"
            :class="[p.delta > 0 && logKind === 'rep' ? 'preset--good' : 'preset--bad', { 'preset--on': preset === p.key }]"
            @click="pick(p.key, p.delta)"
          >
            <span class="preset__label">{{ $t(`reputation.presets.${p.key}.label`) }}</span>
            <span class="preset__example">{{ $t(`reputation.presets.${p.key}.example`) }}</span>
          </button>
        </div>

        <v-text-field v-model="reasonText" :label="$t('reputation.log.reason')" :placeholder="$t('reputation.log.reasonPlaceholder')" variant="outlined" density="comfortable" class="mb-2" />
        <v-select v-model="sessionId" :items="sessionOptions" :label="$t('reputation.log.session')" variant="outlined" density="compact" clearable hide-details class="mb-3" />

        <!-- Ripples: the world moves too (pre-checked, untick what shouldn't) -->
        <div v-if="ripples.length && playerId === 0" class="ripples pa-3 rounded">
          <div class="text-body-small font-weight-bold mb-1"><v-icon size="small" class="mr-1">mdi-waves</v-icon>{{ $t('reputation.log.ripples') }}</div>
          <v-checkbox
            v-for="r in ripples"
            :key="r.subject_id"
            v-model="rippleOn"
            :value="r.subject_id"
            density="compact"
            hide-details
          >
            <template #label>
              <span :class="r.delta > 0 ? 'text-success' : 'text-error'" class="font-weight-bold mr-2">{{ r.delta > 0 ? '▲' : '▼' }}</span>
              {{ r.subject_name }}
              <span class="text-medium-emphasis ml-1">· {{ $t(`reputation.why.${r.why}`) }}</span>
            </template>
          </v-checkbox>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!pickedId || !delta" :loading="saving" @click="save">{{ $t('reputation.log.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { NOTORIETY_PRESETS, REP_PRESETS, type RepKind, type RepRipple, type RepSubjectType } from '~~/types/reputation'

/** Log what happened: pick who, a preset (hidden points), a reason; ripples go along. */
const props = defineProps<{
  modelValue: boolean
  subjects: Array<{ id: number, name: string, type: RepSubjectType }>
  subjectId?: number | null
  reason?: string | null
  kind?: RepKind
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean], 'logged': [reactions: string[]] }>()

const rep = useReputationStore()
const story = useStoryBoardStore()
const snackbar = useSnackbarStore()
const { t } = useI18n()

const pickedId = ref<number | null>(null)
const logKind = ref<RepKind>('rep')
const playerId = ref(0)
const preset = ref<string | null>(null)
const delta = ref(0)
const reasonText = ref('')
const sessionId = ref<number | null>(null)
const ripples = ref<RepRipple[]>([])
const rippleOn = ref<number[]>([])
const saving = ref(false)
const sessions = ref<{ id: number, session_number: number | null, title: string }[]>([])

const subject = computed(() => props.subjects.find(s => s.id === pickedId.value) ?? null)
const players = computed(() => story.entities.filter(e => e.type === 'Player'))
const presets = computed(() => (logKind.value === 'notoriety' ? NOTORIETY_PRESETS : REP_PRESETS))
const sessionOptions = computed(() => sessions.value.map(s => ({ title: s.session_number ? `#${s.session_number} ${s.title}` : s.title, value: s.id })))

watch(() => props.modelValue, async (open) => {
  if (!open) return
  await rep.load(useCampaignStore().activeCampaignIdNumber)
  pickedId.value = props.subjectId ?? props.subjects[0]?.id ?? null
  logKind.value = props.kind ?? 'rep'
  playerId.value = 0
  preset.value = null
  delta.value = 0
  reasonText.value = props.reason ?? ''
  ripples.value = []
  if (rep.campaignId) {
    sessions.value = await $fetch<typeof sessions.value>('/api/sessions', { query: { campaignId: rep.campaignId } }).catch(() => [])
    const newest = [...sessions.value].sort((a, b) => (b.session_number ?? 0) - (a.session_number ?? 0) || b.id - a.id)[0]
    sessionId.value = newest?.id ?? null
  }
}, { immediate: true })

function pick(key: string, d: number) {
  preset.value = key
  delta.value = d
}

// Fresh ripple suggestions whenever who / how much changes
watch([pickedId, delta, logKind], async () => {
  ripples.value = pickedId.value && delta.value && logKind.value === 'rep' ? await rep.ripples(pickedId.value, delta.value).catch(() => []) : []
  rippleOn.value = ripples.value.map(r => r.subject_id)
})
watch(logKind, () => {
  preset.value = null
  delta.value = 0
})

async function save() {
  if (!pickedId.value || !delta.value) return
  saving.value = true
  try {
    const r = await rep.log({
      subject_id: pickedId.value,
      delta: delta.value,
      player_id: playerId.value,
      kind: logKind.value,
      reason: reasonText.value || null,
      preset: preset.value,
      session_id: sessionId.value,
      ripples: playerId.value === 0 ? ripples.value.filter(x => rippleOn.value.includes(x.subject_id)).map(x => ({ subject_id: x.subject_id, delta: x.delta })) : [],
    })
    if (r.reactions.length) snackbar.success(t('reputation.log.worldReacted', { list: r.reactions.join(' · ') }))
    emit('logged', r.reactions)
    emit('update:modelValue', false)
  }
  finally {
    saving.value = false
  }
}
</script>

<style scoped>
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
}
.preset {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
  padding: 8px 10px;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  color: rgb(var(--v-theme-on-surface));
  transition: border-color 0.15s, background 0.15s;
}
.preset--good {
  background: rgba(var(--v-theme-success), 0.12);
}
.preset--bad {
  background: rgba(var(--v-theme-error), 0.12);
}
.preset--good.preset--on {
  border-color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.25);
}
.preset--bad.preset--on {
  border-color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.25);
}
.preset__label {
  font-weight: 700;
  font-size: 0.9rem;
}
.preset__example {
  font-size: 0.72rem;
  opacity: 0.75;
  line-height: 1.25;
}
.ripples {
  background: rgba(var(--v-theme-info), 0.08);
  border: 1px dashed rgba(var(--v-theme-info), 0.5);
}
</style>
