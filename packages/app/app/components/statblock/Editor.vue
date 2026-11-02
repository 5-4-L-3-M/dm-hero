<template>
  <div class="sb-editor">
    <!-- Paste from notes / a PDF -->
    <v-expansion-panels variant="accordion" class="mb-3">
      <v-expansion-panel>
        <v-expansion-panel-title><v-icon start size="small">mdi-clipboard-text-outline</v-icon>{{ $t('statblock.paste.title') }}</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-textarea v-model="pasted" :placeholder="$t('statblock.paste.placeholder')" rows="5" auto-grow variant="outlined" density="compact" hide-details />
          <div class="d-flex align-center mt-2">
            <span v-if="pasteError" class="text-body-small text-warning">{{ $t('statblock.paste.nothing') }}</span>
            <v-spacer />
            <v-btn size="small" color="primary" variant="tonal" :disabled="!pasted.trim()" @click="applyPaste">{{ $t('statblock.paste.apply') }}</v-btn>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-row dense>
      <v-col cols="4" sm="2"><v-text-field v-model="b.size" :label="$t('statblock.fields.size')" v-bind="field" /></v-col>
      <v-col cols="8" sm="5"><v-text-field v-model="b.kind" :label="$t('statblock.fields.kind')" v-bind="field" /></v-col>
      <v-col cols="12" sm="5"><v-text-field v-model="b.alignment" :label="$t('statblock.fields.alignment')" v-bind="field" /></v-col>
      <v-col cols="3" sm="2"><v-text-field v-model.number="b.ac" type="number" label="AC" v-bind="field" /></v-col>
      <v-col cols="9" sm="4"><v-text-field v-model="b.ac_note" :label="$t('statblock.fields.ac_note')" v-bind="field" /></v-col>
      <v-col cols="3" sm="2"><v-text-field v-model.number="b.hp" type="number" label="HP" v-bind="field" /></v-col>
      <v-col cols="9" sm="4"><v-text-field v-model="b.hp_formula" :label="$t('statblock.fields.hp_formula')" placeholder="2d8+2" v-bind="field" /></v-col>
      <v-col cols="12" sm="6"><v-text-field v-model="b.speed" :label="$t('statblock.fields.speed')" placeholder="30 ft., climb 20 ft." v-bind="field" /></v-col>
      <v-col cols="6" sm="3"><v-text-field v-model="b.cr" label="CR" placeholder="1/4" v-bind="field" /></v-col>
      <v-col cols="6" sm="3"><v-text-field v-model.number="b.xp" type="number" label="XP" v-bind="field" /></v-col>
    </v-row>
    <div class="abilities my-2">
      <v-text-field v-for="a in ABILITIES" :key="a" v-model.number="b[a]" type="number" :label="a.toUpperCase()" :hint="fmtMod(abilityMod(b[a]))" persistent-hint v-bind="field" />
    </div>
    <v-row dense>
      <v-col v-for="k in DETAIL_KEYS" :key="k" cols="12" sm="6">
        <v-text-field v-model="b[k]" :label="$t(`statblock.fields.${k}`)" v-bind="field" />
      </v-col>
    </v-row>

    <div v-for="s in FEATURE_SECTIONS" :key="s" class="mt-3">
      <div class="d-flex align-center">
        <span class="text-body-medium font-weight-bold">{{ $t(`statblock.sections.${s}`) }}</span>
        <v-spacer />
        <v-btn size="x-small" variant="text" prepend-icon="mdi-plus" @click="add(s)">{{ $t('statblock.addFeature') }}</v-btn>
      </div>
      <div v-for="(f, i) in (b[s] ?? [])" :key="i" class="d-flex ga-2 align-start mt-1">
        <v-text-field v-model="f.name" :label="$t('statblock.featureName')" v-bind="field" class="feat-name" />
        <v-textarea v-model="f.text" :label="$t('statblock.featureText')" rows="1" auto-grow v-bind="field" />
        <v-btn icon="mdi-close" size="small" variant="text" @click="remove(s, i)" />
      </div>
    </div>
    <v-textarea v-model="b.notes" :label="$t('statblock.sections.notes')" :hint="$t('statblock.notesHint')" persistent-hint rows="2" auto-grow variant="outlined" density="compact" class="mt-4" />
  </div>
</template>

<script setup lang="ts">
import { ABILITIES, FEATURE_SECTIONS, abilityMod, fmtMod, parseStatText, type StatBlock, type StatFeature } from '~~/types/statblock'

/** Edit a stat block field by field — or paste one in and let it be read. */
const model = defineModel<StatBlock>({ required: true })
const b = model
const field = { variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const }
const DETAIL_KEYS = ['saves', 'skills', 'senses', 'languages', 'resistances', 'immunities', 'vulnerabilities', 'condition_immunities'] as const

function add(s: typeof FEATURE_SECTIONS[number]) {
  const list = [...((b.value[s] as StatFeature[] | undefined) ?? []), { name: '', text: '' }]
  b.value = { ...b.value, [s]: list }
}
function remove(s: typeof FEATURE_SECTIONS[number], i: number) {
  const list = [...((b.value[s] as StatFeature[] | undefined) ?? [])]
  list.splice(i, 1)
  b.value = { ...b.value, [s]: list }
}

const pasted = ref('')
const pasteError = ref(false)
function applyPaste() {
  const p = parseStatText(pasted.value)
  pasteError.value = !p
  if (!p) return
  const merged: StatBlock = { ...b.value }
  for (const [k, v] of Object.entries(p.block)) {
    if (Array.isArray(v)) {
      if (v.length) (merged as Record<string, unknown>)[k] = [...((merged as Record<string, StatFeature[] | undefined>)[k] ?? []), ...v]
    }
    else if (v != null) (merged as Record<string, unknown>)[k] = v
  }
  b.value = merged
  pasted.value = ''
}
</script>

<style scoped>
.abilities {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}
.feat-name {
  max-width: 200px;
}
</style>
