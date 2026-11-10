<template>
  <div class="dm-ref d-flex flex-column">
    <!-- Search + expand/collapse -->
    <div class="d-flex align-center ga-1 px-3 pt-3 pb-2 flex-shrink-0">
      <v-text-field
        v-model="query"
        :placeholder="$t('dmReference.search')"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="flex-grow-1"
      />
      <v-btn icon variant="text" size="small" @click="toggleAll">
        <v-icon>{{ allOpen ? 'mdi-unfold-less-horizontal' : 'mdi-unfold-more-horizontal' }}</v-icon>
        <v-tooltip activator="parent" location="bottom">{{ allOpen ? $t('dmReference.collapseAll') : $t('dmReference.expandAll') }}</v-tooltip>
      </v-btn>
    </div>

    <div class="flex-grow-1 overflow-y-auto px-3 pb-4">
      <div v-if="loading && !sections.length" class="text-center py-6"><v-progress-circular indeterminate size="24" /></div>
      <div v-else-if="query && !visible.length" class="text-body-small text-medium-emphasis py-4 text-center">{{ $t('dmReference.noMatch') }}</div>

      <v-expansion-panels v-model="openIds" multiple variant="accordion" class="dm-ref__panels">
        <v-expansion-panel v-for="(s, i) in visible" :key="s.id" :value="s.id" elevation="0">
          <v-expansion-panel-title class="dm-ref__title">
            <v-icon size="small" class="mr-2" color="primary">{{ s.icon || 'mdi-text-box-outline' }}</v-icon>
            <span class="dm-ref__title-text">{{ s.title }}</span>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <!-- Edit in place -->
            <template v-if="editingId === s.id">
              <v-text-field v-model="draft.title" :label="$t('dmReference.sectionTitle')" variant="outlined" density="compact" class="mb-2" hide-details />
              <v-textarea v-model="draft.body" variant="outlined" density="compact" auto-grow rows="8" hide-details class="dm-ref__editor" />
              <div class="text-body-small text-medium-emphasis mt-1">{{ $t('dmReference.formatHint') }}</div>
              <div class="d-flex flex-wrap align-center ga-2 mt-3">
                <v-btn size="small" color="primary" variant="flat" :loading="saving" @click="save(s)">{{ $t('common.save') }}</v-btn>
                <v-btn size="small" variant="text" @click="editingId = null">{{ $t('common.cancel') }}</v-btn>
                <v-spacer />
                <v-btn size="small" variant="text" icon="mdi-arrow-up" :disabled="query !== '' || i === 0" @click="move(s, -1)" />
                <v-btn size="small" variant="text" icon="mdi-arrow-down" :disabled="query !== '' || i === visible.length - 1" @click="move(s, 1)" />
                <v-btn size="small" variant="text" color="error" icon="mdi-delete-outline" @click="remove(s)" />
              </div>
            </template>
            <template v-else>
              <SharedFormattedText :text="query ? filterBody(s.body) : s.body" class="dm-ref__body" />
              <div class="d-flex justify-end">
                <v-btn size="x-small" variant="text" prepend-icon="mdi-pencil" @click="startEdit(s)">{{ $t('common.edit') }}</v-btn>
              </div>
            </template>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <v-btn v-if="!query" block variant="tonal" size="small" prepend-icon="mdi-plus" class="mt-3" @click="add">{{ $t('dmReference.addSection') }}</v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * DM Screen: the DM's own rules and reminders, pinned in the side panel so it
 * opens on any page. Folding sections, a search box, and every section editable
 * in place (plain text with DM Hero's light formatting).
 */
interface Section { id: number, title: string, icon: string | null, body: string, sort_order: number }

const { t } = useI18n()
const campaignStore = useCampaignStore()
const campaignId = computed(() => campaignStore.activeCampaignIdNumber)

const sections = ref<Section[]>([])
const loading = ref(false)
const query = ref('')
const openIds = ref<number[]>([])
const editingId = ref<number | null>(null)
const draft = ref({ title: '', body: '' })
const saving = ref(false)

const openKey = computed(() => `dmhero.dmReference.open.${campaignId.value}`)

async function load() {
  if (!campaignId.value) return
  loading.value = true
  try {
    sections.value = await $fetch<Section[]>('/api/dashboard/reference', { query: { campaignId: campaignId.value } })
    try {
      const saved = JSON.parse(localStorage.getItem(openKey.value) ?? '[]')
      openIds.value = Array.isArray(saved) ? saved.filter((id: number) => sections.value.some(s => s.id === id)) : []
    }
    catch {
      openIds.value = []
    }
  }
  finally {
    loading.value = false
  }
}
watch(campaignId, load, { immediate: true })

// Remember which sections are open (only while not searching)
let beforeSearch: number[] | null = null
watch(openIds, (ids) => {
  if (query.value) return
  try {
    localStorage.setItem(openKey.value, JSON.stringify(ids))
  }
  catch {
    // storage blocked — fine for this visit
  }
})

const words = computed(() => (query.value ?? '').toLowerCase().split(/\s+/).filter(Boolean))
const matches = (text: string) => words.value.every(w => text.toLowerCase().includes(w))

const visible = computed(() => {
  if (!words.value.length) return sections.value
  return sections.value.filter(s => matches(`${s.title}\n${s.body}`))
})

// While searching, open every matching section; restore afterwards
watch(query, (q, old) => {
  if (q && !old) beforeSearch = [...openIds.value]
  if (q) openIds.value = visible.value.map(s => s.id)
  else if (beforeSearch) {
    openIds.value = beforeSearch
    beforeSearch = null
  }
})

/** When searching, keep only the matching lines and the headings above them (a title match shows everything). */
function filterBody(body: string) {
  const lines = body.split('\n')
  if (!lines.some(l => matches(l))) return body
  const out: string[] = []
  let heading: string | null = null
  for (const l of lines) {
    if (/^\s*#/.test(l)) {
      heading = l
      continue
    }
    if (!matches(l)) continue
    if (heading) {
      out.push(heading)
      heading = null
    }
    out.push(l)
  }
  return out.join('\n')
}

const allOpen = computed(() => visible.value.length > 0 && visible.value.every(s => openIds.value.includes(s.id)))
function toggleAll() {
  openIds.value = allOpen.value ? [] : visible.value.map(s => s.id)
}

function startEdit(s: Section) {
  editingId.value = s.id
  draft.value = { title: s.title, body: s.body }
}

async function save(s: Section) {
  if (!draft.value.title.trim()) return
  saving.value = true
  try {
    const updated = await $fetch<Section>(`/api/dashboard/reference/${s.id}`, { method: 'PATCH', body: { title: draft.value.title, body: draft.value.body } })
    Object.assign(s, updated)
    editingId.value = null
  }
  finally {
    saving.value = false
  }
}

async function add() {
  if (!campaignId.value) return
  const created = await $fetch<Section>('/api/dashboard/reference', { method: 'POST', body: { campaignId: campaignId.value, title: t('dmReference.newSection'), body: '' } })
  sections.value.push(created)
  openIds.value = [...openIds.value, created.id]
  startEdit(created)
}

async function remove(s: Section) {
  if (!window.confirm(t('dmReference.confirmDelete', { name: s.title }))) return
  await $fetch(`/api/dashboard/reference/${s.id}`, { method: 'DELETE' })
  sections.value = sections.value.filter(x => x.id !== s.id)
  editingId.value = null
}

async function move(s: Section, dir: -1 | 1) {
  const i = sections.value.indexOf(s)
  const j = i + dir
  if (j < 0 || j >= sections.value.length) return
  const list = [...sections.value]
  ;[list[i], list[j]] = [list[j]!, list[i]!]
  sections.value = list
  await $fetch('/api/dashboard/reference/reorder', { method: 'PATCH', body: { ids: list.map(x => x.id) } })
}
</script>

<style scoped>
.dm-ref__panels :deep(.v-expansion-panel) {
  background: transparent;
}
.dm-ref__title {
  min-height: 44px !important;
  padding-block: 8px;
  font-weight: 600;
}
.dm-ref__title-text {
  min-width: 0;
  overflow-wrap: anywhere;
}
.dm-ref__body {
  font-size: 0.875rem;
  line-height: 1.5;
}
.dm-ref__editor :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.8125rem;
}
</style>
