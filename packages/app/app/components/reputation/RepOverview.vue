<template>
  <div>
    <!-- Advance the world + the automation switches -->
    <v-card variant="tonal" color="primary" class="pa-3 mb-3">
      <div class="d-flex flex-wrap align-center ga-3">
        <v-icon>mdi-earth</v-icon>
        <div>
          <div class="text-title-small font-weight-bold">{{ $t('reputation.world.title') }}</div>
          <div class="text-body-small">{{ $t('reputation.world.hint') }}</div>
        </div>
        <v-spacer />
        <v-switch :model-value="story.settings.rep_consequences" :label="$t('reputation.world.consequences')" color="primary" density="compact" hide-details @update:model-value="story.saveSettings({ rep_consequences: !!$event })" />
        <v-switch :model-value="story.settings.rep_rumors" :label="$t('reputation.world.rumors')" color="primary" density="compact" hide-details @update:model-value="story.saveSettings({ rep_rumors: !!$event })" />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-fast-forward" :loading="advancing" @click="advance">{{ $t('reputation.world.advance') }}</v-btn>
      </div>
    </v-card>

    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <v-btn-toggle v-model="section" mandatory density="compact" variant="outlined" divided color="primary">
        <v-btn value="Faction" size="small" prepend-icon="mdi-shield">{{ $t('reputation.sections.factions') }}</v-btn>
        <v-btn value="Location" size="small" prepend-icon="mdi-map-marker">{{ $t('reputation.sections.places') }}</v-btn>
        <v-btn value="NPC" size="small" prepend-icon="mdi-account-group">{{ $t('reputation.sections.people') }}</v-btn>
      </v-btn-toggle>
      <v-spacer />
      <v-autocomplete
        v-model="addId"
        :items="addable"
        item-title="name"
        item-value="id"
        :placeholder="$t('reputation.track')"
        prepend-inner-icon="mdi-plus"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="add-field"
        @update:model-value="addTracked"
      />
    </div>

    <div v-if="!rows.length" class="text-body-medium text-medium-emphasis py-6 text-center">{{ $t(`reputation.empty.${section}`) }}</div>
    <div class="rep-grid">
      <div v-for="r in rows" :key="r.id" class="rep-row">
        <div class="d-flex align-center ga-1 mb-1">
          <SharedEntityLink :id="r.id" :type="section" :name="r.name" class="font-weight-medium text-truncate" />
          <v-icon v-if="section === 'NPC' && rep.isMet(r.id)" size="x-small" color="success" :title="$t('reputation.met')">mdi-handshake</v-icon>
          <v-spacer />
          <v-btn icon="mdi-plus" size="x-small" variant="tonal" color="primary" :title="$t('reputation.log.short')" @click="logFor(r)" />
          <v-btn icon="mdi-history" size="x-small" variant="text" :title="$t('reputation.history')" @click="historyFor(r)" />
        </div>
        <div role="button" tabindex="0" class="cursor-pointer" @click="historyFor(r)" @keydown.enter="historyFor(r)">
          <RepBar :points="r.points" :type="section" />
          <RepBar v-for="sub in r.splits" :key="sub.player_id" class="mt-1 ml-3" small :points="sub.points" :type="section" :label="sub.player_name" />
          <RepBar v-if="r.notoriety" class="mt-1" small :points="r.notoriety" :type="section" kind="notoriety" :label="$t('reputation.kinds.notoriety')" />
        </div>
      </div>
    </div>

    <RepLogDialog v-if="active" v-model="logOpen" :subjects="[active]" :subject-id="active.id" />
    <RepHistoryDialog v-if="active" v-model="historyOpen" :subject="active" />

    <!-- What moved in the world -->
    <v-dialog v-model="turnOpen" max-width="520">
      <v-card>
        <v-card-title><v-icon class="mr-2">mdi-fast-forward</v-icon>{{ $t('reputation.world.turnTitle') }}</v-card-title>
        <v-card-text>
          <div v-if="turn && !turn.agendas.length && !turn.cooled.length" class="text-medium-emphasis">{{ $t('reputation.world.quiet') }}</div>
          <div v-for="(a, i) in turn?.agendas ?? []" :key="`a${i}`" class="turn-row" :class="{ 'turn-row--done': a.done }">
            <v-icon size="small" class="mr-2">{{ a.done ? 'mdi-alert-decagram' : 'mdi-clock-outline' }}</v-icon>
            <div><strong>{{ a.faction }}</strong> — {{ a.goal }} <span class="text-medium-emphasis">({{ a.filled }}/{{ a.size }})</span></div>
          </div>
          <div v-for="(c, i) in turn?.cooled ?? []" :key="`c${i}`" class="turn-row turn-row--cool">
            <v-icon size="small" class="mr-2">mdi-snowflake</v-icon>
            <div>{{ $t('reputation.world.cooled', { place: c.place }) }}</div>
          </div>
          <div v-if="turn?.sparks" class="text-body-small text-medium-emphasis mt-3">{{ $t('reputation.world.sparks', { n: turn.sparks }) }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="turnOpen = false">{{ $t('common.close') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import RepBar from './RepBar.vue'
import RepLogDialog from './RepLogDialog.vue'
import RepHistoryDialog from './RepHistoryDialog.vue'
import type { RepSubjectType, RepTrack } from '~~/types/reputation'

/** World tab: every faction, top-level place and met NPC with their bars; advance the world. */
const props = defineProps<{ campaignId: number | null }>()
const rep = useReputationStore()
const story = useStoryBoardStore()
watch(() => props.campaignId, (id) => {
  rep.load(id, true)
  story.load(id)
}, { immediate: true })

const section = ref<RepSubjectType>('Faction')

interface Row { id: number, name: string, type: RepSubjectType, points: number, notoriety: number, splits: RepTrack[] }
const rows = computed<Row[]>(() => {
  const tracked = new Set(rep.tracks.filter(t => t.subject_type === section.value).map(t => t.subject_id))
  let base: Array<{ id: number, name: string }>
  if (section.value === 'Faction') base = story.entities.filter(e => e.type === 'Faction')
  else if (section.value === 'Location') base = story.locations.filter(l => !l.parent_id || tracked.has(l.id))
  else base = story.entities.filter(e => e.type === 'NPC' && (tracked.has(e.id) || rep.isMet(e.id)))
  return base.map((b) => {
    const tr = rep.tracksOf(b.id)
    return {
      id: b.id,
      name: b.name,
      type: section.value,
      points: tr.find(t => t.player_id === 0)?.points ?? 0,
      notoriety: rep.tracksOf(b.id, 'notoriety').find(t => t.player_id === 0)?.points ?? 0,
      splits: tr.filter(t => t.player_id !== 0),
    }
  }).sort((a, b) => Math.abs(b.points) - Math.abs(a.points) || a.name.localeCompare(b.name))
})

// Track something not listed yet (a sub-location, an NPC they haven't met)
const addId = ref<number | null>(null)
const addable = computed(() => {
  const shown = new Set(rows.value.map(r => r.id))
  const pool = section.value === 'Location' ? story.locations : story.entities.filter(e => e.type === section.value)
  return pool.filter(e => !shown.has(e.id))
})
async function addTracked(id: number | null) {
  if (!id) return
  await rep.addTrack(id)
  addId.value = null
}

const active = ref<{ id: number, name: string, type: RepSubjectType } | null>(null)
const logOpen = ref(false)
const historyOpen = ref(false)
function logFor(r: Row) {
  active.value = { id: r.id, name: r.name, type: r.type }
  logOpen.value = true
}
function historyFor(r: Row) {
  active.value = { id: r.id, name: r.name, type: r.type }
  historyOpen.value = true
}

const advancing = ref(false)
const turnOpen = ref(false)
const turn = ref<Awaited<ReturnType<typeof rep.advance>> | null>(null)
async function advance() {
  advancing.value = true
  try {
    turn.value = await rep.advance()
    turnOpen.value = true
  }
  finally {
    advancing.value = false
  }
}
</script>

<style scoped>
.rep-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}
.rep-row {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
}
.add-field {
  max-width: 280px;
  min-width: 200px;
}
.cursor-pointer {
  cursor: pointer;
}
.turn-row {
  display: flex;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 6px;
  background: rgba(var(--v-theme-info), 0.08);
}
.turn-row--done {
  background: rgba(var(--v-theme-warning), 0.15);
}
.turn-row--cool {
  background: rgba(var(--v-theme-primary), 0.08);
}
</style>
