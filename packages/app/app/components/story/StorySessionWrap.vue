<template>
  <v-dialog :model-value="modelValue" max-width="760" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        <v-icon color="primary">mdi-flag-checkered</v-icon>{{ $t('story.wrap.title') }}
      </v-card-title>
      <v-card-subtitle class="text-wrap">{{ $t('story.wrap.hint') }}</v-card-subtitle>

      <v-card-text>
        <div class="d-flex align-center ga-2 mb-4">
          <v-select
            v-model="sessionId"
            :items="sessionOptions"
            :label="$t('story.run.logTo')"
            prepend-inner-icon="mdi-book-open-page-variant"
            variant="outlined"
            density="compact"
            hide-details
            class="flex-grow-1"
          />
          <v-btn variant="tonal" prepend-icon="mdi-plus" :loading="creating" @click="newSession">{{ $t('story.wrap.newSession') }}</v-btn>
        </div>

        <div v-for="(beat, i) in beats" :key="beat.id" class="wrap-row">
          <div class="d-flex align-center flex-wrap ga-2">
            <span class="wrap-row__num">{{ i + 1 }}</span>
            <v-icon size="small">{{ BEAT_KIND_ICONS[beat.kind] }}</v-icon>
            <span class="wrap-row__title">{{ beat.title }}</span>
            <v-spacer />
            <v-btn-toggle v-model="choice[beat.id]" mandatory density="compact" variant="outlined" divided>
              <v-btn value="played" size="small" color="success" prepend-icon="mdi-check">{{ $t('story.wrap.played') }}</v-btn>
              <v-btn value="next" size="small" color="primary" prepend-icon="mdi-arrow-right">{{ $t('story.wrap.next') }}</v-btn>
              <v-btn value="cut" size="small" color="error" prepend-icon="mdi-close">{{ $t('story.wrap.cut') }}</v-btn>
            </v-btn-toggle>
          </div>
          <v-text-field
            v-if="choice[beat.id] === 'played'"
            v-model="what[beat.id]"
            :placeholder="$t('story.wrap.what')"
            variant="plain"
            density="compact"
            hide-details
            class="wrap-row__what"
          />
        </div>
      </v-card-text>

      <v-card-actions>
        <span class="text-body-small text-medium-emphasis px-2">{{ $t('story.wrap.summary', counts) }}</span>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="save">{{ $t('story.wrap.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { BEAT_KIND_ICONS, type StoryBeat } from '~~/types/story'

/**
 * Session wrap: walk the next-session tray once after a session.
 * Played → logged to the session (and its "what happened" line kept on the beat and in the session notes),
 * Next time → stays in the tray, Cut → out of the tray, marked cut.
 */
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean], 'drifted': [summary: string] }>()

type Choice = 'played' | 'next' | 'cut'
type SessionRow = Record<string, unknown> & { id: number, session_number: number | null, title: string, notes: string | null }

const { t } = useI18n()
const store = useStoryBoardStore()

const beats = ref<StoryBeat[]>([])
const choice = ref<Record<number, Choice>>({})
const what = ref<Record<number, string>>({})
const sessions = ref<SessionRow[]>([])
const sessionId = ref<number | null>(null)
const saving = ref(false)
const creating = ref(false)

const label = (s: SessionRow) => (s.session_number ? `#${s.session_number} ${s.title}` : s.title)
const sessionOptions = computed(() => sessions.value.map(s => ({ title: label(s), value: s.id })))
const counts = computed(() => {
  const v = Object.values(choice.value)
  return { played: v.filter(c => c === 'played').length, next: v.filter(c => c === 'next').length, cut: v.filter(c => c === 'cut').length }
})

async function loadSessions() {
  sessions.value = await $fetch<SessionRow[]>('/api/sessions', { query: { campaignId: store.campaignId } }).catch(() => [])
  const newest = [...sessions.value].sort((a, b) => (b.session_number ?? 0) - (a.session_number ?? 0) || b.id - a.id)[0]
  sessionId.value = newest?.id ?? null
}

// Start fresh each time it opens: every beat defaults to "next time", so nothing changes by accident
watch(() => props.modelValue, async (open) => {
  if (!open) return
  beats.value = [...store.tray]
  choice.value = Object.fromEntries(beats.value.map(b => [b.id, 'next' as Choice]))
  what.value = {}
  await loadSessions()
})

async function newSession() {
  creating.value = true
  try {
    const n = Math.max(0, ...sessions.value.map(s => s.session_number ?? 0)) + 1
    const s = await $fetch<SessionRow>('/api/sessions', { method: 'POST', body: { campaignId: store.campaignId, title: t('story.wrap.sessionTitle', { n }), session_number: n } })
    sessions.value = [s, ...sessions.value]
    sessionId.value = s.id
  }
  finally {
    creating.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const session = sessions.value.find(s => s.id === sessionId.value) ?? null
    const lines: string[] = []
    for (const beat of beats.value) {
      const c = choice.value[beat.id]
      const line = what.value[beat.id]?.trim() ?? ''
      if (c === 'played') {
        const note = line ? `${t('story.wrap.playedNote', { session: session ? label(session) : '' })} ${line}` : ''
        await store.updateBeat(beat.id, {
          ...(session ? { played_session_id: session.id } : { status: 'played', in_tray: false }),
          ...(note ? { body: beat.body ? `${beat.body}\n\n${note}` : note } : {}),
        })
        lines.push(`- ✓ ${beat.title}${line ? ` — ${line}` : ''}`)
      }
      else if (c === 'cut') {
        await store.updateBeat(beat.id, { status: 'cut', in_tray: false })
        lines.push(`- ✗ ${beat.title} (${t('story.wrap.cut').toLowerCase()})`)
      }
      else {
        lines.push(`- → ${beat.title} (${t('story.wrap.next').toLowerCase()})`)
      }
    }
    // The log: one block appended to the session's notes (every other field sent back unchanged)
    if (session && lines.length) {
      const block = `## ${t('story.wrap.title')}\n${lines.join('\n')}`
      const { id, ...rest } = session
      await $fetch(`/api/sessions/${id}`, { method: 'PATCH', body: { ...rest, notes: session.notes ? `${session.notes}\n\n${block}` : block } })
    }
    // Heat drift: what the party touched warms up, what sat idle two sessions cools
    const touched = [...new Set(beats.value.filter(b => choice.value[b.id] === 'played' && b.cluster_id).map(b => b.cluster_id!))]
    const changes = await store.drift(touched)
    if (changes.length) emit('drifted', changes.map(c => `${c.title}: ${t(`story.heat.${c.to}`)}`).join(' · '))
    emit('update:modelValue', false)
  }
  finally {
    saving.value = false
  }
}
</script>

<style scoped>
.wrap-row {
  padding: 6px 4px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.wrap-row__num {
  min-width: 1.4em;
  text-align: right;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.wrap-row__title {
  font-weight: 600;
  min-width: 0;
}
.wrap-row__what {
  padding-left: 3.2em;
}
</style>
