<template>
  <v-container fluid class="roster-page">
    <div v-if="!campaignId" class="text-center py-16">
      <v-icon icon="mdi-account-box-multiple" size="64" class="mb-4" color="primary" />
      <h2 class="text-headline-large mb-4">{{ $t('story.noCampaign') }}</h2>
      <v-btn color="primary" size="large" to="/campaigns" prepend-icon="mdi-arrow-right">{{ $t('nav.chooseCampaign') }}</v-btn>
    </div>

    <template v-else>
      <div class="d-flex align-center flex-wrap ga-3 mb-3">
        <div>
          <div class="text-headline-large">
            <v-icon icon="mdi-account-box-multiple" size="36" class="mr-2" />{{ $t('roster.title') }}
          </div>
          <p class="text-body-large text-medium-emphasis">{{ $t('roster.subtitle') }}</p>
        </div>
        <v-spacer />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="addPlaceOpen = true">{{ $t('roster.addPlace') }}</v-btn>
      </div>

      <v-card variant="tonal" class="pa-3 mb-4">
        <div class="d-flex flex-wrap align-center ga-3">
          <v-btn-toggle v-if="settlements.length > 1" v-model="settlement" mandatory density="compact" variant="outlined" divided color="primary">
            <v-btn value="" size="small">{{ $t('roster.allPlaces') }}</v-btn>
            <v-btn v-for="s in settlements" :key="s" :value="s" size="small">{{ s }}</v-btn>
          </v-btn-toggle>
          <v-text-field v-model="search" :placeholder="$t('roster.search')" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable class="search-field" />
          <v-switch v-model="onlyOpen" :label="$t('roster.onlyOpen')" color="primary" density="compact" hide-details />
          <v-spacer />
          <span class="text-body-small text-medium-emphasis">{{ $t('roster.summary', { filled: filledCount, open: openCount }) }}</span>
        </div>
        <div class="d-flex flex-wrap align-center ga-3 mt-2 text-body-small">
          <span class="text-medium-emphasis">{{ $t('npcs.loyalty.label') }}:</span>
          <span v-for="l in NPC_LOYALTIES" :key="l" class="d-flex align-center">
            <v-icon size="x-small" :color="NPC_LOYALTY_COLORS[l]" class="mr-1">mdi-circle</v-icon>{{ $t(`npcs.loyalty.${l}`) }}
          </span>
        </div>
      </v-card>

      <v-progress-linear v-if="loading && !data" indeterminate class="mb-3" />

      <div v-if="data && !data.places.length" class="text-center py-12 text-medium-emphasis">
        <v-icon size="56" class="mb-2">mdi-account-box-multiple-outline</v-icon>
        <div class="text-title-medium mb-1">{{ $t('roster.emptyTitle') }}</div>
        <div class="text-body-medium mb-4">{{ $t('roster.emptyText') }}</div>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="addPlaceOpen = true">{{ $t('roster.addPlace') }}</v-btn>
      </div>

      <!-- Category headings (fold), then each place with its roles -->
      <section v-for="cat in groups" :key="cat.name" class="mb-5">
        <button type="button" class="cat-head" :aria-expanded="!folded.includes(cat.name)" @click="toggleFold(cat.name)">
          <v-icon class="mr-2">{{ folded.includes(cat.name) ? 'mdi-chevron-right' : 'mdi-chevron-down' }}</v-icon>
          <span class="text-headline-small">{{ cat.name || $t('roster.noCategory') }}</span>
          <v-chip size="small" class="ml-3">{{ cat.places.length }}</v-chip>
        </button>

        <div v-show="!folded.includes(cat.name)">
          <v-card v-for="p in cat.places" :key="p.location_id" variant="outlined" class="mb-3 place-card">
            <div class="d-flex align-center flex-wrap ga-2 px-4 pt-3">
              <span class="text-title-large font-weight-bold">
                <SharedEntityLink :id="p.location_id" :type="p.kind" :name="p.name" />
              </span>
              <span v-if="p.kind === 'Faction'" class="text-body-medium text-medium-emphasis font-italic">{{ $t('roster.faction') }}</span>
              <span v-if="p.type" class="text-body-medium text-medium-emphasis font-italic">{{ $te(`locations.types.${p.type}`) ? $t(`locations.types.${p.type}`) : p.type }}</span>
              <v-chip v-if="openIn(p.location_id)" size="x-small" color="warning" variant="tonal">{{ $t('roster.openCount', { n: openIn(p.location_id) }) }}</v-chip>
              <v-spacer />
              <v-menu>
                <template #activator="{ props: menu }">
                  <v-btn v-bind="menu" icon="mdi-dots-vertical" size="small" variant="text" :aria-label="$t('common.actions')" />
                </template>
                <v-list density="compact">
                  <v-list-item prepend-icon="mdi-folder-move-outline" :title="$t('roster.changeCategory')" @click="editCategory(p)" />
                  <v-list-item prepend-icon="mdi-close" base-color="error" :title="$t('roster.removePlace')" @click="removePlace(p)" />
                </v-list>
              </v-menu>
            </div>

            <v-table density="comfortable" class="roster-table">
              <thead>
                <tr>
                  <th class="col-role">{{ $t('roster.columns.role') }}</th>
                  <th class="col-npc">{{ $t('roster.columns.npc') }}</th>
                  <th class="col-info">{{ $t('roster.columns.info') }}</th>
                  <th class="col-notes">{{ $t('roster.columns.notes') }}</th>
                  <th class="col-actions" />
                </tr>
              </thead>
              <draggable
                :model-value="rolesOf(p.location_id)"
                tag="tbody"
                item-key="id"
                handle=".role-drag"
                :disabled="onlyOpen"
                :animation="150"
                @update:model-value="(list: RosterRole[]) => reorderRoles(p.location_id, list)"
              >
                <template #item="{ element: r }">
                  <tr :class="{ 'row-open': !r.npc }">
                    <td class="col-role">
                      <div class="d-flex align-start">
                        <v-icon v-if="!onlyOpen" size="small" class="role-drag mt-2 mr-1 text-medium-emphasis" :title="$t('roster.dragHint')">mdi-drag-vertical</v-icon>
                        <v-textarea
                          :model-value="r.role"
                          variant="plain"
                          density="compact"
                          hide-details
                          auto-grow
                          rows="1"
                          class="role-field font-weight-medium"
                          @keydown.enter.prevent="($event.target as HTMLTextAreaElement).blur()"
                          @change="(e: Event) => updateRole(r, { role: (e.target as HTMLTextAreaElement).value.replace(/\s+/g, ' ').trim() })"
                        />
                      </div>
                    </td>
                    <td class="col-npc">
                      <div v-if="r.npc && editingRole !== r.id" class="d-flex align-center ga-3 py-2">
                        <v-avatar size="72" rounded="lg" :color="r.npc.image_url ? undefined : 'surface-variant'">
                          <v-img v-if="r.npc.image_url" :src="`/uploads/${r.npc.image_url}`" cover />
                          <v-icon v-else>mdi-account</v-icon>
                        </v-avatar>
                        <div class="min-w-0">
                          <SharedEntityLink :id="r.npc.id" type="NPC" :name="r.npc.name" class="font-weight-medium" />
                          <v-icon v-if="rep.isMet(r.npc.id)" size="x-small" color="success" class="ml-1" :title="$t('reputation.met')">mdi-handshake</v-icon>
                          <div>
                            <v-btn size="x-small" variant="text" class="px-0 text-medium-emphasis" prepend-icon="mdi-pencil" @click="editingRole = r.id">{{ $t('common.edit') }}</v-btn>
                          </div>
                        </div>
                      </div>
                      <div v-else class="py-1">
                        <v-autocomplete
                          v-model:search="npcSearch[r.id]"
                          :model-value="r.npc?.id ?? null"
                          :items="npcs"
                          item-title="name"
                          item-value="id"
                          :placeholder="$t('roster.pickNpc')"
                          prepend-inner-icon="mdi-account-plus-outline"
                          variant="outlined"
                          density="compact"
                          hide-details
                          :autofocus="editingRole === r.id"
                          class="npc-pick"
                          @update:model-value="id => id && pickNpc(r, id)"
                        >
                          <template #no-data>
                            <SharedCreateFromSearch :search="npcSearch[r.id]" type="NPC" @created="e => npcCreated(r, e.id)" />
                          </template>
                        </v-autocomplete>
                        <!-- Editing a filled role: emptying it is a deliberate second click -->
                        <div v-if="editingRole === r.id" class="d-flex ga-1 mt-1">
                          <v-btn size="x-small" variant="text" color="error" prepend-icon="mdi-account-remove-outline" @click="clearNpc(r)">{{ $t('roster.clearNpc') }}</v-btn>
                          <v-btn size="x-small" variant="text" prepend-icon="mdi-check" @click="editingRole = null">{{ $t('roster.doneEditing') }}</v-btn>
                        </div>
                      </div>
                    </td>
                    <td class="col-info">
                      <template v-if="r.npc">
                        <div v-if="r.npc.loyalty" class="d-flex align-center">
                          <v-icon size="x-small" :color="NPC_LOYALTY_COLORS[r.npc.loyalty]" class="mr-1">mdi-circle</v-icon>{{ $t(`npcs.loyalty.${r.npc.loyalty}`) }}
                        </div>
                        <div class="text-medium-emphasis">{{ infoLine(r) }}</div>
                      </template>
                      <span v-else class="text-medium-emphasis">{{ $t('roster.open') }}</span>
                    </td>
                    <td class="col-notes">
                      <v-textarea
                        :model-value="r.note ?? ''"
                        :placeholder="$t('roster.notePlaceholder')"
                        variant="plain"
                        density="compact"
                        rows="1"
                        auto-grow
                        hide-details
                        @change="(e: Event) => updateRole(r, { note: (e.target as HTMLTextAreaElement).value })"
                      />
                    </td>
                    <td class="col-actions">
                      <v-btn icon="mdi-delete-outline" size="small" variant="text" :aria-label="$t('common.delete')" @click="removeRole(r)" />
                    </td>
                  </tr>
                </template>
              </draggable>
            </v-table>

            <!-- Add a role: one click for the usual ones, or type your own -->
            <div class="d-flex flex-wrap align-center ga-2 px-4 pb-3 pt-2">
              <span class="text-body-small text-medium-emphasis">{{ $t('roster.addRole') }}</span>
              <v-chip v-for="s in suggestions(p)" :key="s" size="small" variant="outlined" prepend-icon="mdi-plus" @click="addRole(p.location_id, s)">{{ s }}</v-chip>
              <v-text-field
                v-model="newRole[p.location_id]"
                :placeholder="$t('roster.customRole')"
                variant="outlined"
                density="compact"
                hide-details
                class="custom-role"
                @keyup.enter="addCustomRole(p.location_id)"
              />
            </div>
          </v-card>
        </div>
      </section>
    </template>

    <!-- Put a place on the roster -->
    <v-dialog v-model="addPlaceOpen" max-width="460">
      <v-card>
        <v-card-title>{{ $t('roster.addPlace') }}</v-card-title>
        <v-card-text>
          <v-autocomplete
            v-model="addPlaceId"
            v-model:search="placeSearch"
            :items="placeOptions"
            item-title="name"
            item-value="id"
            :label="$t('roster.placeOrFaction')"
            prepend-inner-icon="mdi-map-marker"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :prepend-icon="item.kind === 'Faction' ? 'mdi-shield' : 'mdi-map-marker'" :subtitle="item.kind === 'Faction' ? $t('roster.faction') : undefined" />
            </template>
            <template #no-data>
              <SharedCreateFromSearch :search="placeSearch" type="Location" @created="e => (addPlaceId = e.id)" />
            </template>
          </v-autocomplete>
          <v-combobox v-model="addPlaceCategory" :items="categories" :label="$t('roster.category')" :hint="$t('roster.categoryHint')" persistent-hint variant="outlined" density="comfortable" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addPlaceOpen = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!addPlaceId" @click="addPlace">{{ $t('common.add') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Move a place to another category heading -->
    <v-dialog v-model="categoryOpen" max-width="420">
      <v-card>
        <v-card-title>{{ $t('roster.changeCategory') }}</v-card-title>
        <v-card-text>
          <v-combobox v-model="categoryValue" :items="categories" :label="$t('roster.category')" variant="outlined" density="comfortable" autofocus />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="categoryOpen = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveCategory">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import { NPC_LOYALTIES, NPC_LOYALTY_COLORS } from '~~/types/npc'
import { DEFAULT_ROLES, ROLE_TEMPLATES, type Roster, type RosterPlace, type RosterRole } from '~~/types/roster'

/**
 * NPC roster: places grouped under your own category headings, each with
 * roles that are filled by an NPC or still open, plus a hook / note per role.
 */
const { t } = useI18n()
const campaignStore = useCampaignStore()
const store = useStoryBoardStore()
const { raceName } = useReferenceNames()
const rep = useReputationStore()

const campaignId = computed(() => campaignStore.activeCampaignIdNumber)
const data = ref<Roster | null>(null)
const loading = ref(false)

async function load() {
  if (!campaignId.value) return
  loading.value = true
  try {
    data.value = await $fetch<Roster>('/api/roster', { query: { campaignId: campaignId.value } })
  }
  finally {
    loading.value = false
  }
}
watch(campaignId, (id) => {
  store.load(id)
  rep.load(id)
  load()
}, { immediate: true })

const npcs = computed(() => store.entities.filter(e => e.type === 'NPC'))

// --- filters, grouping -----------------------------------------------------
const settlement = ref('')
const search = ref('')
const onlyOpen = ref(false)
const settlements = computed(() => [...new Set((data.value?.places ?? []).map(p => p.settlement_name).filter((x): x is string => !!x))].sort())

const rolesOf = (locationId: number) => (data.value?.roles ?? []).filter(r => r.location_id === locationId && (!onlyOpen.value || !r.npc))
const openIn = (locationId: number) => (data.value?.roles ?? []).filter(r => r.location_id === locationId && !r.npc).length
const filledCount = computed(() => (data.value?.roles ?? []).filter(r => r.npc).length)
const openCount = computed(() => (data.value?.roles ?? []).filter(r => !r.npc).length)

function matches(p: RosterPlace) {
  if (settlement.value && p.settlement_name !== settlement.value) return false
  if (onlyOpen.value && !openIn(p.location_id)) return false
  const q = (search.value ?? '').toLowerCase().trim()
  if (!q) return true
  if (p.name.toLowerCase().includes(q)) return true
  return (data.value?.roles ?? []).some(r => r.location_id === p.location_id && [r.role, r.note ?? '', r.npc?.name ?? ''].some(s => s.toLowerCase().includes(q)))
}
const categories = computed(() => [...new Set((data.value?.places ?? []).map(p => p.category).filter((x): x is string => !!x))])
const groups = computed(() => {
  const shown = (data.value?.places ?? []).filter(matches)
  const names = [...new Set(shown.map(p => p.category ?? ''))]
  return names.map(name => ({ name, places: shown.filter(p => (p.category ?? '') === name) }))
})

// Folded headings are remembered per campaign
const folded = ref<string[]>([])
const foldKey = computed(() => `dmhero.roster.folded.${campaignId.value}`)
watch(foldKey, (k) => {
  try {
    folded.value = JSON.parse(localStorage.getItem(k) ?? '[]')
  }
  catch {
    folded.value = []
  }
}, { immediate: true })
function toggleFold(name: string) {
  folded.value = folded.value.includes(name) ? folded.value.filter(x => x !== name) : [...folded.value, name]
  try {
    localStorage.setItem(foldKey.value, JSON.stringify(folded.value))
  }
  catch {
    // storage blocked — fine for this visit
  }
}

function infoLine(r: RosterRole) {
  const n = r.npc!
  const parts = [n.race ? raceName(n.race) || n.race : null, n.age !== null ? (n.age_human && n.age_human !== String(n.age) ? `${n.age} (≈${n.age_human})` : String(n.age)) : null]
  return parts.filter(Boolean).join(' · ')
}

// --- roles -----------------------------------------------------------------
const npcSearch = ref<Record<number, string>>({})
const newRole = ref<Record<number, string>>({})

function suggestions(p: RosterPlace) {
  const have = new Set((data.value?.roles ?? []).filter(r => r.location_id === p.location_id).map(r => r.role.toLowerCase()))
  return (ROLE_TEMPLATES[p.kind === 'Faction' ? 'guild' : (p.type ?? '')] ?? DEFAULT_ROLES).filter(s => !have.has(s.toLowerCase()))
}

async function addRole(locationId: number, role: string) {
  const r = await $fetch<RosterRole>('/api/roster/roles', { method: 'POST', body: { campaignId: campaignId.value, location_id: locationId, role } })
  data.value?.roles.push(r)
}
async function addCustomRole(locationId: number) {
  const role = (newRole.value[locationId] ?? '').trim()
  if (!role) return
  newRole.value[locationId] = ''
  await addRole(locationId, role)
}
async function updateRole(r: RosterRole, changes: { role?: string, npc_id?: number | null, note?: string }) {
  const updated = await $fetch<RosterRole>(`/api/roster/roles/${r.id}`, { method: 'PATCH', body: changes })
  if (!data.value) return
  const i = data.value.roles.findIndex(x => x.id === r.id)
  if (i >= 0) data.value.roles[i] = updated
}
/** Drag a role up or down within its place */
async function reorderRoles(locationId: number, list: RosterRole[]) {
  if (!data.value) return
  data.value.roles = [...data.value.roles.filter(r => r.location_id !== locationId), ...list]
  await $fetch('/api/roster/order', { method: 'POST', body: { campaignId: campaignId.value, location_id: locationId, role_ids: list.map(r => r.id) } })
}
// Changing who fills a role happens in edit mode (no stray "clear" next to every name)
const editingRole = ref<number | null>(null)
async function pickNpc(r: RosterRole, id: number) {
  editingRole.value = null
  if (id !== r.npc?.id) await updateRole(r, { npc_id: id })
}
async function clearNpc(r: RosterRole) {
  editingRole.value = null
  await updateRole(r, { npc_id: null })
}
async function npcCreated(r: RosterRole, id: number) {
  editingRole.value = null
  await updateRole(r, { npc_id: id })
  store.load(campaignId.value, true)
}
async function removeRole(r: RosterRole) {
  await $fetch(`/api/roster/roles/${r.id}`, { method: 'DELETE' })
  if (data.value) data.value.roles = data.value.roles.filter(x => x.id !== r.id)
}

// --- places ----------------------------------------------------------------
const addPlaceOpen = ref(false)
const addPlaceId = ref<number | null>(null)
const addPlaceCategory = ref<string | null>(null)
const placeSearch = ref('')
const placeOptions = computed(() => [
  ...store.locations.map(l => ({ id: l.id, name: l.name, kind: 'Location' as const })),
  ...store.entities.filter(e => e.type === 'Faction').map(f => ({ id: f.id, name: f.name, kind: 'Faction' as const })),
].filter(o => !(data.value?.places ?? []).some(p => p.location_id === o.id)).sort((a, b) => a.name.localeCompare(b.name)))

async function addPlace() {
  if (!addPlaceId.value) return
  await $fetch('/api/roster/places', { method: 'POST', body: { campaignId: campaignId.value, location_id: addPlaceId.value, category: addPlaceCategory.value } })
  addPlaceOpen.value = false
  addPlaceId.value = null
  await load()
}
async function removePlace(p: RosterPlace) {
  await $fetch(`/api/roster/places/${p.location_id}`, { method: 'DELETE' })
  await load()
}

const categoryOpen = ref(false)
const categoryPlace = ref<RosterPlace | null>(null)
const categoryValue = ref<string | null>(null)
function editCategory(p: RosterPlace) {
  categoryPlace.value = p
  categoryValue.value = p.category
  categoryOpen.value = true
}
async function saveCategory() {
  if (categoryPlace.value) await $fetch(`/api/roster/places/${categoryPlace.value.location_id}`, { method: 'PATCH', body: { category: categoryValue.value ?? '' } })
  categoryOpen.value = false
  await load()
}
</script>

<style scoped>
.search-field {
  max-width: 280px;
  min-width: 200px;
}
.cat-head {
  display: flex;
  align-items: center;
  width: 100%;
  background: none;
  border: 0;
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.5);
  color: rgb(var(--v-theme-primary));
  padding: 4px 0 6px;
  margin-bottom: 12px;
  cursor: pointer;
  text-align: left;
}
.roster-table {
  background: transparent;
}
.roster-table td {
  vertical-align: top;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}
.col-role {
  width: 190px;
  min-width: 170px;
}
.col-npc {
  width: 300px;
  min-width: 240px;
}
.col-info {
  width: 170px;
}
td.col-info {
  font-size: 0.85rem;
  padding-top: 14px !important;
}
.col-actions {
  width: 48px;
}
/* Notes keep a readable width; when the page gets narrow (side panel open) the table scrolls sideways instead */
.col-notes {
  min-width: 260px;
}
.role-drag {
  cursor: grab;
  flex-shrink: 0;
}
.role-field :deep(textarea) {
  overflow-wrap: break-word;
}
.row-open td {
  background: rgba(var(--v-theme-warning), 0.06);
}
.npc-pick {
  max-width: 280px;
}
.custom-role {
  max-width: 220px;
  min-width: 160px;
}
.min-w-0 {
  min-width: 0;
}
</style>
