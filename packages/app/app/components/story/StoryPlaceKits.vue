<template>
  <div>
    <v-text-field
      v-model="search"
      :placeholder="$t('story.places.search')"
      prepend-inner-icon="mdi-magnify"
      variant="solo-filled"
      flat
      density="compact"
      hide-details
      clearable
      class="mb-2"
    />
    <div v-if="loading" class="text-center py-4"><v-progress-circular indeterminate size="24" /></div>
    <div v-else-if="!shown.length" class="text-body-small text-medium-emphasis pa-2">{{ $t('story.places.empty') }}</div>

    <div v-for="kit in shown" :key="kit.id" class="kit" :class="{ 'kit--here': kit.id === store.settings.party_location_id }">
      <div class="kit__head" role="button" tabindex="0" @click="toggle(kit.id)" @keydown.enter="toggle(kit.id)">
        <v-icon size="small" class="text-medium-emphasis">{{ opened.includes(kit.id) ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
        <span class="kit__name" @click.stop><SharedEntityLink :id="kit.id" type="Location" :name="kit.name" /></span>
        <v-chip v-if="kit.live_beats" size="x-small" color="primary" variant="tonal" :title="$t('story.places.liveBeats')">
          <v-icon start size="x-small">mdi-lightning-bolt</v-icon>{{ kit.live_beats }}
        </v-chip>
        <v-chip size="x-small" variant="text">{{ kit.people.length }}</v-chip>
      </div>

      <div v-if="opened.includes(kit.id)" class="kit__body">
        <div v-if="kit.parent_name" class="text-body-small text-medium-emphasis mb-1">{{ kit.parent_name }}</div>
        <div v-for="p in kit.people" :key="p.id" class="kit__person">
          <SharedEntityLink :id="p.id" type="NPC" :name="p.name" />
          <span class="kit__role">{{ roleLabel(p.role) }}</span>
        </div>

        <template v-if="editing === kit.id">
          <v-textarea v-model="draft" auto-grow rows="3" variant="outlined" density="compact" hide-details class="mt-2" :placeholder="$t('story.places.notePlaceholder')" />
          <div class="d-flex justify-end ga-1 mt-1">
            <v-btn size="small" variant="text" @click="editing = null">{{ $t('common.cancel') }}</v-btn>
            <v-btn size="small" color="primary" variant="flat" @click="saveNote(kit)">{{ $t('common.save') }}</v-btn>
          </div>
        </template>
        <template v-else>
          <SharedFormattedText v-if="kit.note" :text="kit.note" class="text-body-small mt-2" />
          <v-btn size="x-small" variant="text" class="mt-1 px-1" :prepend-icon="kit.note ? 'mdi-pencil' : 'mdi-plus'" @click="startEdit(kit)">
            {{ kit.note ? $t('story.places.editNote') : $t('story.places.addNote') }}
          </v-btn>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PlaceKit } from '~~/types/story'

/**
 * Place kits: one folding card per place, built from relations (who owns it, works there, hangs out there),
 * plus a short table note. The party's current place floats to the top.
 */
const { t, te } = useI18n()
const store = useStoryBoardStore()

const kits = ref<PlaceKit[]>([])
const loading = ref(false)
const search = ref('')
const opened = useStoryPref<number[]>('placesOpen', [])
const editing = ref<number | null>(null)
const draft = ref('')

async function load() {
  if (!store.campaignId) return
  loading.value = true
  kits.value = await $fetch<PlaceKit[]>('/api/story/places', { query: { campaignId: store.campaignId } }).catch(() => [])
  loading.value = false
}
onMounted(load)
// Live beat counts follow the board
watch(() => store.beats.length, load)

const shown = computed(() => {
  const q = (search.value ?? '').trim().toLowerCase()
  const list = q
    ? kits.value.filter(k => k.name.toLowerCase().includes(q) || k.people.some(p => p.name.toLowerCase().includes(q)) || (k.note ?? '').toLowerCase().includes(q))
    : kits.value
  const here = store.settings.party_location_id
  return [...list].sort((a, b) => Number(b.id === here) - Number(a.id === here))
})

function toggle(id: number) {
  opened.value = opened.value.includes(id) ? opened.value.filter(x => x !== id) : [...opened.value, id]
}
function roleLabel(role: string) {
  const key = `npcs.relationTypes.${role}`
  return te(key) ? t(key) : role
}
function startEdit(kit: PlaceKit) {
  draft.value = kit.note ?? ''
  editing.value = kit.id
}
async function saveNote(kit: PlaceKit) {
  const res = await $fetch<{ note: string | null }>(`/api/story/places/${kit.id}`, { method: 'PUT', body: { campaignId: store.campaignId, note: draft.value } })
  kit.note = res.note
  editing.value = null
}
</script>

<style scoped>
.kit {
  border-radius: 8px;
  margin-bottom: 2px;
}
.kit--here {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-primary));
}
.kit__head {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 8px;
  cursor: pointer;
}
.kit__head:hover,
.kit__head:focus-visible {
  background: rgba(var(--v-theme-on-surface), 0.06);
  outline: none;
}
.kit__name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kit__body {
  padding: 0 8px 8px 30px;
}
.kit__person {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.875rem;
  line-height: 1.6;
}
.kit__role {
  font-size: 0.75rem;
  opacity: 0.6;
}
</style>
