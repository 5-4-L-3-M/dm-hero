<template>
  <v-container fluid class="monsters-page">
    <div v-if="!campaignId" class="text-center py-16">
      <v-icon icon="mdi-paw" size="64" class="mb-4" color="primary" />
      <h2 class="text-headline-large mb-4">{{ $t('story.noCampaign') }}</h2>
      <v-btn color="primary" size="large" to="/campaigns" prepend-icon="mdi-arrow-right">{{ $t('nav.chooseCampaign') }}</v-btn>
    </div>

    <template v-else>
      <div class="d-flex align-center flex-wrap ga-3 mb-3">
        <div>
          <div class="text-headline-large"><v-icon icon="mdi-paw" size="36" class="mr-2" />{{ $t('monsters.title') }}</div>
          <p class="text-body-large text-medium-emphasis">{{ $t('monsters.subtitle') }}</p>
        </div>
        <v-spacer />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openNew">{{ $t('monsters.new') }}</v-btn>
      </div>

      <div class="layout">
        <!-- The list -->
        <v-card variant="outlined" class="list-card d-flex flex-column">
          <div class="pa-3 d-flex flex-column ga-2">
            <v-text-field v-model="search" :placeholder="$t('monsters.search')" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable />
            <div class="d-flex flex-wrap ga-1">
              <v-chip v-for="s in SOURCES" :key="s" size="small" :variant="source === s ? 'flat' : 'outlined'" color="primary" @click="source = s">{{ $t(`monsters.sources.${s}`) }}</v-chip>
            </div>
            <div class="d-flex align-center ga-2">
              <span class="text-body-small text-medium-emphasis text-no-wrap">CR</span>
              <v-range-slider v-model="crRange" :min="0" :max="CR_STEPS.length - 1" :step="1" hide-details density="compact" color="primary" />
              <span class="text-body-small text-no-wrap">{{ CR_STEPS[crRange[0]] }}–{{ CR_STEPS[crRange[1]] }}</span>
            </div>
          </div>
          <v-divider />
          <v-progress-linear v-if="loading" indeterminate />
          <div class="list-scroll">
            <v-list density="compact" class="py-0">
              <v-list-item v-for="m in shown" :key="m.id" :active="m.id === selected?.id" color="primary" @click="select(m.id)">
                <template #prepend>
                  <v-avatar size="32" rounded="sm" :color="m.image_url ? undefined : 'surface-variant'">
                    <v-img v-if="m.image_url" :src="`/uploads/${m.image_url}`" cover />
                    <v-icon v-else size="18">{{ m.srd ? 'mdi-book-open-variant' : 'mdi-paw' }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title>{{ m.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ [m.size, m.kind].filter(Boolean).join(' ') }}</v-list-item-subtitle>
                <template #append>
                  <v-chip size="x-small" variant="tonal">CR {{ m.cr ?? '—' }}</v-chip>
                </template>
              </v-list-item>
            </v-list>
            <div v-if="!loading && !shown.length" class="pa-4 text-body-medium text-medium-emphasis text-center">{{ $t('monsters.none') }}</div>
          </div>
          <div class="pa-2 text-body-small text-medium-emphasis text-center">{{ $t('monsters.count', { n: shown.length, total: list.length }) }}</div>
        </v-card>

        <!-- The stat block -->
        <v-card variant="outlined" class="detail-card pa-4">
          <template v-if="selected">
            <div class="d-flex align-start ga-3 mb-2">
              <v-avatar v-if="selected.image_url" size="72" rounded="lg"><v-img :src="`/uploads/${selected.image_url}`" cover /></v-avatar>
              <div class="flex-grow-1">
                <div class="d-flex flex-wrap ga-1 mb-1">
                  <v-chip v-for="t in selected.tags" :key="t" size="x-small" variant="tonal">{{ t === 'SRD' ? $t('monsters.official') : t }}</v-chip>
                </div>
              </div>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-pencil" @click="openEdit(selected)">{{ $t('common.edit') }}</v-btn>
              <v-btn size="small" variant="text" prepend-icon="mdi-content-copy" :title="$t('monsters.copyHint')" @click="copy(selected)">{{ $t('monsters.copy') }}</v-btn>
              <v-btn size="small" variant="text" color="error" icon="mdi-delete" @click="remove(selected)" />
            </div>
            <StatblockView :block="selected.block" :name="selected.name" />
            <v-expansion-panels v-if="selected.description" variant="accordion" class="mt-4">
              <v-expansion-panel :title="$t('monsters.lore')">
                <v-expansion-panel-text><SharedFormattedText :text="selected.description" /></v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </template>
          <div v-else class="text-center text-medium-emphasis py-16">
            <v-icon size="48">mdi-paw</v-icon>
            <div class="text-body-large mt-2">{{ $t('monsters.pick') }}</div>
          </div>
        </v-card>
      </div>

      <!-- Add / edit -->
      <v-dialog v-model="editorOpen" max-width="900" scrollable>
        <v-card>
          <v-card-title>{{ form.id ? $t('monsters.edit') : $t('monsters.new') }}</v-card-title>
          <v-card-text style="max-height: 78vh">
            <v-row dense>
              <v-col cols="12" sm="6"><v-text-field v-model="form.name" :label="$t('monsters.fields.name')" variant="outlined" density="compact" hide-details="auto" autofocus /></v-col>
              <v-col cols="12" sm="6"><v-combobox v-model="form.tags" :items="allTags" :label="$t('monsters.fields.tags')" multiple chips closable-chips variant="outlined" density="compact" hide-details="auto" /></v-col>
            </v-row>
            <div class="mt-3">
              <StatblockEditor v-model="form.block" />
            </div>
            <v-textarea v-model="form.description" :label="$t('monsters.lore')" rows="2" auto-grow variant="outlined" density="compact" class="mt-3" hide-details />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="editorOpen = false">{{ $t('common.cancel') }}</v-btn>
            <v-btn color="primary" variant="flat" :loading="saving" :disabled="!form.name.trim()" @click="save">{{ $t('common.save') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import type { Monster, MonsterSummary } from '~~/types/monster'
import type { StatBlock } from '~~/types/statblock'

/** Monster library: the official SRD creatures plus your own, with readable stat blocks. */
const { t } = useI18n()
const campaign = useCampaignStore()
const campaignId = computed(() => campaign.activeCampaignIdNumber)
const SOURCES = ['all', 'homebrew', 'official'] as const
const CR_STEPS = ['0', '1/8', '1/4', '1/2', ...Array.from({ length: 30 }, (_, i) => String(i + 1))]
const crIndex = (cr: string | null) => Math.max(0, CR_STEPS.indexOf(cr ?? '0'))

const list = ref<MonsterSummary[]>([])
const loading = ref(false)
const search = ref('')
const source = ref<typeof SOURCES[number]>('all')
const crRange = ref<[number, number]>([0, CR_STEPS.length - 1])
const selected = ref<Monster | null>(null)

async function load() {
  if (!campaignId.value) return
  loading.value = true
  try {
    list.value = await $fetch<MonsterSummary[]>('/api/monsters', { query: { campaignId: campaignId.value } })
  }
  finally {
    loading.value = false
  }
}
watch(campaignId, load, { immediate: true })

const shown = computed(() => {
  const q = (search.value ?? '').toLowerCase().trim()
  return list.value.filter(m => (source.value === 'all' || (source.value === 'official') === m.srd)
    && crIndex(m.cr) >= crRange.value[0] && crIndex(m.cr) <= crRange.value[1]
    && (!q || m.name.toLowerCase().includes(q) || (m.kind ?? '').toLowerCase().includes(q) || m.tags.some(x => x.toLowerCase().includes(q))))
})
const allTags = computed(() => [...new Set(list.value.flatMap(m => m.tags).filter(x => x !== 'SRD'))].sort())

async function select(id: number) {
  selected.value = await $fetch<Monster>(`/api/monsters/${id}`)
}

const editorOpen = ref(false)
const saving = ref(false)
const form = ref({ id: null as number | null, name: '', tags: [] as string[], description: '', block: {} as StatBlock })
function openNew() {
  form.value = { id: null, name: '', tags: [], description: '', block: { traits: [], actions: [] } }
  editorOpen.value = true
}
function openEdit(m: Monster) {
  form.value = { id: m.id, name: m.name, tags: [...m.tags], description: m.description ?? '', block: JSON.parse(JSON.stringify(m.block)) as StatBlock }
  editorOpen.value = true
}
async function save() {
  saving.value = true
  try {
    const body = { name: form.value.name, tags: form.value.tags, description: form.value.description || null, block: form.value.block }
    const saved = form.value.id
      ? await $fetch<Monster>(`/api/monsters/${form.value.id}`, { method: 'PATCH', body })
      : await $fetch<Monster>('/api/monsters', { method: 'POST', body: { ...body, campaignId: campaignId.value } })
    editorOpen.value = false
    await load()
    selected.value = saved
  }
  finally {
    saving.value = false
  }
}
async function copy(m: Monster) {
  const c = await $fetch<Monster>(`/api/monsters/${m.id}/copy`, { method: 'POST' })
  await load()
  openEdit(c)
}
async function remove(m: Monster) {
  if (!window.confirm(t('monsters.confirmDelete', { name: m.name }))) return
  await $fetch(`/api/monsters/${m.id}`, { method: 'DELETE' })
  selected.value = null
  await load()
}
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(280px, 380px) 1fr;
  gap: 16px;
  align-items: start;
}
.list-card {
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 110px);
}
.list-scroll {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .list-card {
    position: static;
    max-height: 50vh;
  }
}
</style>
