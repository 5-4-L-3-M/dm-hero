<template>
  <v-card variant="outlined" class="mb-3 pa-3">
    <div class="d-flex align-center mb-3">
      <v-icon class="mr-2" color="primary">mdi-card-account-details-outline</v-icon>
      <span class="text-title-small">{{ $t('players.character.title') }}</span>
    </div>

    <v-row dense>
      <v-col cols="12" sm="6">
        <v-combobox
          v-model="model.race"
          :items="raceOptions"
          :label="$t('players.character.race')"
          :placeholder="$t('players.character.racePlaceholder')"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-combobox
          v-model="model.alignment"
          :items="[...ALIGNMENTS]"
          :label="$t('players.character.alignment')"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
    </v-row>

    <!-- Classes: one row each, for multiclass characters -->
    <div class="text-body-small text-medium-emphasis mt-4 mb-1">{{ $t('players.character.classes') }}</div>
    <v-row v-for="(c, i) in model.classes" :key="i" dense align="center">
      <v-col cols="12" sm="5">
        <v-combobox
          v-model="c.name"
          :items="classOptions"
          :label="$t('players.character.class')"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="4" sm="2">
        <v-text-field
          v-model.number="c.level"
          :label="$t('players.character.level')"
          type="number"
          min="0"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="7" sm="4">
        <v-text-field
          v-model="c.subclass"
          :label="$t('players.character.subclass')"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="1" class="text-right">
        <v-btn icon="mdi-close" variant="text" size="small" :aria-label="$t('common.delete')" @click="model.classes.splice(i, 1)" />
      </v-col>
    </v-row>
    <v-btn size="small" variant="text" prepend-icon="mdi-plus" class="mt-1" @click="model.classes.push({ name: '', level: null, subclass: '' })">
      {{ $t('players.character.addClass') }}
    </v-btn>

    <v-row dense class="mt-2">
      <v-col cols="12" sm="6">
        <v-text-field v-model="model.background" :label="$t('players.character.background')" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="model.patron" :label="$t('players.character.patron')" prepend-inner-icon="mdi-star-four-points-outline" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="model.homeland" :label="$t('players.character.homeland')" prepend-inner-icon="mdi-home-map-marker" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="model.phobia" :label="$t('players.character.phobia')" prepend-inner-icon="mdi-alert-octagon-outline" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="4">
        <v-text-field v-model="model.age" :label="$t('players.character.age')" :placeholder="$t('players.character.agePlaceholder')" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="4">
        <v-text-field v-model="model.height" :label="$t('players.character.height')" placeholder="5' 10&quot;" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="4">
        <v-text-field v-model="model.weight" :label="$t('players.character.weight')" placeholder="180 lb" variant="outlined" density="comfortable" hide-details />
      </v-col>
    </v-row>

    <div class="text-body-small text-medium-emphasis mt-4 mb-1">{{ $t('players.character.combat') }}</div>
    <v-row dense>
      <v-col cols="4" sm="2">
        <v-text-field v-model.number="numbers.ac" :label="$t('players.character.acShort')" type="number" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="4" sm="2">
        <v-text-field v-model.number="numbers.hp" :label="$t('players.character.hpShort')" type="number" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="4" sm="2">
        <v-text-field v-model="model.speed" :label="$t('players.character.speedShort')" placeholder="30 ft" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="4" sm="2">
        <v-text-field v-model="model.initiative" :label="$t('players.character.initiativeShort')" placeholder="+2" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="4" sm="2">
        <v-text-field v-model="model.proficiency" :label="$t('players.character.proficiencyShort')" placeholder="+2" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="4" sm="2">
        <v-text-field v-model.number="numbers.passive_perception" :label="$t('players.character.passivePerceptionShort')" type="number" variant="outlined" density="comfortable" hide-details />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { ALIGNMENTS, type PlayerCharacterInfo } from '~~/types/player'

/** Editor for a player character's race, classes, background and quick stats. */
const model = defineModel<PlayerCharacterInfo>({ required: true })

const { locale } = useI18n()

// Number fields: an emptied box comes back as "" — store that as null
function numberField(key: 'ac' | 'hp' | 'passive_perception') {
  return computed<number | string | null>({
    get: () => model.value[key],
    set: (v) => {
      const n = Number(v)
      model.value[key] = v === '' || v === null || !Number.isFinite(n) ? null : n
    },
  })
}
const numbers = reactive({
  ac: numberField('ac'),
  hp: numberField('hp'),
  passive_perception: numberField('passive_perception'),
})

// Suggestions from Reference Data; anything can still be typed (homebrew)
interface RefRow { name: string, name_de?: string | null, name_en?: string | null }
const races = ref<RefRow[]>([])
const classes = ref<RefRow[]>([])
const label = (r: RefRow) => (locale.value === 'de' ? r.name_de : r.name_en) || r.name_en || r.name
const raceOptions = computed(() => races.value.map(label))
const classOptions = computed(() => classes.value.map(label))

onMounted(async () => {
  const [r, c] = await Promise.all([
    $fetch<RefRow[]>('/api/races').catch(() => []),
    $fetch<RefRow[]>('/api/classes').catch(() => []),
  ])
  races.value = r
  classes.value = c
})
</script>
