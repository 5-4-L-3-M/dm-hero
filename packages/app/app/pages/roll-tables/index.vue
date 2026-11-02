<template>
  <v-container fluid class="roll-page">
    <div v-if="!campaignId" class="text-center py-16">
      <v-icon icon="mdi-dice-multiple" size="64" class="mb-4" color="primary" />
      <h2 class="text-headline-large mb-4">{{ $t('story.noCampaign') }}</h2>
      <v-btn color="primary" size="large" to="/campaigns" prepend-icon="mdi-arrow-right">{{ $t('nav.chooseCampaign') }}</v-btn>
    </div>

    <template v-else>
      <div class="d-flex align-center flex-wrap ga-3 mb-3">
        <div>
          <div class="text-headline-large"><v-icon icon="mdi-dice-multiple" size="36" class="mr-2" />{{ $t('rollTables.title') }}</div>
          <p class="text-body-large text-medium-emphasis">{{ $t('rollTables.subtitle') }}</p>
        </div>
        <v-spacer />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openNew">{{ $t('rollTables.new') }}</v-btn>
      </div>

      <v-card variant="tonal" class="pa-3 mb-4">
        <div class="d-flex flex-wrap align-center ga-2">
          <v-text-field v-model="search" :placeholder="$t('rollTables.search')" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable class="search-field" />
          <v-chip :variant="!category ? 'flat' : 'outlined'" color="primary" size="small" @click="category = null">{{ $t('rollTables.all') }} ({{ tables.length }})</v-chip>
          <v-chip v-for="c in categories" :key="c" :variant="category === c ? 'flat' : 'outlined'" color="primary" size="small" @click="category = c">{{ c }}</v-chip>
        </div>
      </v-card>

      <v-progress-linear v-if="loading" indeterminate class="mb-3" />
      <div v-if="!loading && !shown.length" class="text-center text-medium-emphasis py-12">
        <v-icon size="48" class="mb-2">mdi-dice-multiple-outline</v-icon>
        <div class="text-title-medium">{{ tables.length ? $t('rollTables.noMatch') : $t('rollTables.empty') }}</div>
        <div v-if="!tables.length" class="text-body-medium">{{ $t('rollTables.emptyHint') }}</div>
      </div>

      <template v-for="g in groups" :key="g.name">
        <div class="text-title-medium font-weight-bold mt-4 mb-2">{{ g.name }}</div>
        <div class="roll-grid">
          <RollTablesCard v-for="tb in g.tables" :key="tb.id" :table="tb" @edit="openEdit" @delete="remove" />
        </div>
      </template>

      <RollTablesEditor v-model="editorOpen" :table="editing" :categories="categories" @saved="load" />
    </template>
  </v-container>
</template>

<script setup lang="ts">
import type { RollTable } from '~~/types/rollTable'

/** All roll tables: by category, searchable; tag them to quests, places and sessions. */
const { t } = useI18n()
const campaign = useCampaignStore()
const campaignId = computed(() => campaign.activeCampaignIdNumber)
const tables = ref<RollTable[]>([])
const loading = ref(false)
const search = ref('')
const category = ref<string | null>(null)
const editorOpen = ref(false)
const editing = ref<RollTable | null>(null)

async function load() {
  if (!campaignId.value) return
  loading.value = true
  try {
    tables.value = await $fetch<RollTable[]>('/api/roll-tables', { query: { campaignId: campaignId.value } })
  }
  finally {
    loading.value = false
  }
}
watch(campaignId, load, { immediate: true })

const categories = computed(() => [...new Set(tables.value.map(x => x.category).filter((x): x is string => !!x))].sort())
const shown = computed(() => {
  const q = (search.value ?? '').toLowerCase().trim()
  return tables.value.filter(x => (!category.value || x.category === category.value)
    && (!q || x.name.toLowerCase().includes(q) || x.rows.some(r => r.result.toLowerCase().includes(q)) || x.tags.some(tg => tg.name.toLowerCase().includes(q))))
})
const groups = computed(() => {
  const out: Array<{ name: string, tables: RollTable[] }> = []
  for (const tb of shown.value) {
    const name = tb.category || t('rollTables.general')
    let g = out.find(x => x.name === name)
    if (!g) out.push(g = { name, tables: [] })
    g.tables.push(tb)
  }
  return out
})

function openNew() {
  editing.value = null
  editorOpen.value = true
}
function openEdit(tb: RollTable) {
  editing.value = tb
  editorOpen.value = true
}
async function remove(tb: RollTable) {
  if (!window.confirm(t('rollTables.confirmDelete', { name: tb.name }))) return
  await $fetch(`/api/roll-tables/${tb.id}`, { method: 'DELETE' })
  await load()
}
</script>

<style scoped>
.search-field {
  max-width: 320px;
  min-width: 220px;
}
.roll-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
  align-items: start;
}
</style>
