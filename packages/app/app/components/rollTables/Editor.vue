<template>
  <v-dialog :model-value="modelValue" max-width="760" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>{{ form.id ? $t('rollTables.edit') : $t('rollTables.new') }}</v-card-title>
      <v-card-text style="max-height: 75vh">
        <v-row dense>
          <v-col cols="12" sm="7">
            <v-text-field v-model="form.name" :label="$t('rollTables.fields.name')" variant="outlined" density="comfortable" autofocus />
          </v-col>
          <v-col cols="8" sm="3">
            <v-combobox v-model="form.category" :items="categories" :label="$t('rollTables.fields.category')" variant="outlined" density="comfortable" clearable />
          </v-col>
          <v-col cols="4" sm="2">
            <v-text-field v-model="form.dice" :label="$t('rollTables.fields.dice')" :placeholder="autoDice" variant="outlined" density="comfortable" :error="!!form.dice && !parseDice(form.dice)" />
          </v-col>
        </v-row>
        <v-textarea v-model="form.description" :label="$t('rollTables.fields.description')" rows="1" auto-grow variant="outlined" density="comfortable" />
        <v-text-field v-model="form.columns" :label="$t('rollTables.fields.columns')" :hint="$t('rollTables.columnsHint')" persistent-hint :placeholder="$t('rollTables.columnsPlaceholder')" variant="outlined" density="comfortable" class="mb-3" />

        <div class="d-flex align-center mb-1">
          <span class="text-body-medium font-weight-bold">{{ $t('rollTables.fields.rows') }}</span>
          <v-spacer />
          <span class="text-body-small text-medium-emphasis">{{ $t('rollTables.rowsHint') }}</span>
        </div>
        <v-row dense>
          <v-col cols="12" md="6">
            <v-textarea v-model="rowsText" rows="10" auto-grow variant="outlined" density="compact" class="mono" :placeholder="'1-4 | A pickpocket brushes past\n5-6 | City watch patrol\n7 | Rain'" hide-details />
          </v-col>
          <v-col cols="12" md="6">
            <div class="preview pa-2 rounded">
              <div class="text-body-small text-medium-emphasis mb-1">{{ $t('rollTables.preview', { n: rows.length, dice: form.dice || autoDice }) }}</div>
              <RollTablesChart v-if="rows.length" :rows="rows" :dice="form.dice || autoDice" :columns="cleanColumns(form.columns)" />
              <div v-if="gaps.length" class="text-body-small text-warning mt-1">{{ $t('rollTables.gaps', { list: gaps.join(', ') }) }}</div>
            </div>
          </v-col>
        </v-row>

        <v-autocomplete
          v-model="form.tagKeys"
          :items="tagOptions"
          item-title="name"
          item-value="key"
          :label="$t('rollTables.fields.tags')"
          :hint="$t('rollTables.tagsHint')"
          persistent-hint
          multiple
          chips
          closable-chips
          variant="outlined"
          density="comfortable"
          class="mt-4"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :subtitle="item.typeLabel" />
          </template>
        </v-autocomplete>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" :disabled="!form.name.trim()" @click="save">{{ $t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { cleanColumns, parseDice, parseHeader, parseRows, tableDice, type RollTable } from '~~/types/rollTable'

/** Make or edit a roll table: paste rows, see them parsed, tag where it belongs. */
const props = defineProps<{
  modelValue: boolean
  table?: RollTable | null
  categories: string[]
  /** Pre-tag a new table (opened from a quest / place / session) */
  presetTags?: string[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean], 'saved': [table: RollTable] }>()

const { t } = useI18n()
const campaign = useCampaignStore()
const story = useStoryBoardStore()
const saving = ref(false)
const sessions = ref<Array<{ id: number, session_number: number | null, title: string }>>([])
const form = ref({ id: null as number | null, name: '', category: null as string | null, dice: '', description: '', columns: '', tagKeys: [] as string[] })
const rowsText = ref('')

watch(() => props.modelValue, async (open) => {
  if (!open) return
  const tb = props.table
  form.value = {
    id: tb?.id ?? null,
    name: tb?.name ?? '',
    category: tb?.category ?? null,
    dice: tb?.dice ?? '',
    description: tb?.description ?? '',
    columns: (tb?.columns ?? []).join(' | '),
    tagKeys: tb ? tb.tags.map(x => `${x.kind}:${x.ref_id}`) : [...(props.presetTags ?? [])],
  }
  rowsText.value = (tb?.rows ?? []).map(r => `${r.min === r.max ? r.min : `${r.min}-${r.max}`} | ${r.result}`).join('\n')
  story.load(campaign.activeCampaignIdNumber)
  sessions.value = await $fetch<typeof sessions.value>('/api/sessions', { query: { campaignId: campaign.activeCampaignIdNumber } }).catch(() => [])
}, { immediate: true })

const rows = computed(() => parseRows(rowsText.value))
// A pasted header line ("| d8 | Round | Save |") fills in the column headings and die
watch(rowsText, (text) => {
  const head = parseHeader(text)
  if (head && !form.value.columns.trim()) form.value.columns = head.join(' | ')
  const die = text.trim().match(/^\|?\s*(\d*d\d+)\s*\|/i)?.[1]
  if (die && !form.value.dice) form.value.dice = die
})
const autoDice = computed(() => tableDice({ dice: null, rows: rows.value }))
const gaps = computed(() => {
  const top = Math.max(0, ...rows.value.map(r => r.max))
  const missing: number[] = []
  for (let n = 1; n <= top && missing.length < 6; n++) if (!rows.value.some(r => n >= r.min && n <= r.max)) missing.push(n)
  return missing
})

const TAG_TYPES = ['Quest', 'Location', 'NPC', 'Faction', 'Lore', 'Item']
const tagOptions = computed(() => [
  ...sessions.value.map(s => ({ key: `session:${s.id}`, name: s.session_number ? `#${s.session_number} ${s.title}` : s.title, typeLabel: t('rollTables.session') })),
  ...story.entities.filter(e => TAG_TYPES.includes(e.type)).map(e => ({ key: `entity:${e.id}`, name: e.name, typeLabel: t(`rollTables.types.${e.type}`) })),
])

async function save() {
  saving.value = true
  try {
    const body = {
      name: form.value.name,
      category: form.value.category,
      dice: form.value.dice || null,
      description: form.value.description,
      columns: cleanColumns(form.value.columns),
      rows: rows.value,
      tags: form.value.tagKeys.map((k) => {
        const [kind, id] = k.split(':')
        return { kind: kind as 'entity' | 'session', ref_id: Number(id) }
      }),
    }
    const saved = form.value.id
      ? await $fetch<RollTable>(`/api/roll-tables/${form.value.id}`, { method: 'PATCH', body })
      : await $fetch<RollTable>('/api/roll-tables', { method: 'POST', body: { ...body, campaignId: campaign.activeCampaignIdNumber } })
    emit('saved', saved)
    emit('update:modelValue', false)
  }
  finally {
    saving.value = false
  }
}
</script>

<style scoped>
.mono :deep(textarea) {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.85rem;
}
.preview {
  background: rgba(var(--v-theme-on-surface), 0.04);
  min-height: 100%;
}
.range {
  min-width: 40px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
