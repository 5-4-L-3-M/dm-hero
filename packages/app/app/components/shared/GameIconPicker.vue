<template>
  <v-dialog :model-value="modelValue" max-width="640" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center ga-3">
        <v-avatar size="44" rounded="lg" variant="tonal" color="primary"><SharedGameIcon :name="picked ?? guess" :size="32" /></v-avatar>
        <div class="min-w-0">
          <div>{{ $t('icons.pickTitle') }}</div>
          <div class="text-body-small text-medium-emphasis text-truncate">{{ itemName }}</div>
        </div>
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="q"
          :placeholder="$t('icons.search')"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          autofocus
          class="mb-3"
        />
        <div v-if="!q" class="text-body-small text-medium-emphasis mb-2">{{ $t('icons.ideas') }}</div>
        <div class="icon-grid">
          <button
            v-for="n in shown"
            :key="n"
            type="button"
            class="icon-cell"
            :class="{ 'icon-cell--on': (picked ?? guess) === n }"
            :title="n.replace(/-/g, ' ')"
            @click="picked = n"
          >
            <SharedGameIcon :name="n" :size="36" />
          </button>
        </div>
        <div v-if="q && !results.length && !searching" class="text-body-medium text-medium-emphasis py-4 text-center">{{ $t('icons.none') }}</div>
        <div class="text-body-small text-medium-emphasis mt-3">
          {{ $t('icons.credit') }} <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> (CC BY 3.0)
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" prepend-icon="mdi-auto-fix" @click="choose(null)">{{ $t('icons.auto') }}</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" @click="choose(picked ?? guess)">{{ $t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
/** Pick an item icon from the game-icons.net set; "Automatic" goes back to the guess from its name. */
const props = defineProps<{ modelValue: boolean, itemName: string, current: string | null, guess: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean], 'pick': [icon: string | null] }>()
const { search } = useGameIcons()

const IDEAS = ['swap-bag', 'backpack', 'standing-potion', 'health-potion', 'poison-bottle', 'scroll-unfurled', 'open-book', 'treasure-map', 'broadsword', 'plain-dagger', 'crossbow', 'round-shield', 'chain-mail', 'leather-boot', 'cloak', 'diamond-ring', 'gems', 'necklace', 'crystal-wand', 'wizard-staff', 'orb-direction', 'candle-flame', 'lantern-flame', 'beer-stein', 'wine-bottle', 'hot-meal', 'bed', 'horse-head', 'coins', 'key', 'padlock', 'rope-coil', 'sparkles', 'skull-crossed-bones', 'fire-gem', 'rune-stone']
const q = ref('')
const picked = ref<string | null>(null)
const results = ref<string[]>([])
const searching = ref(false)
watch(() => props.modelValue, (open) => {
  if (!open) return
  q.value = ''
  picked.value = props.current
})
let seq = 0
watch(q, async (v) => {
  const mine = ++seq
  searching.value = true
  const r = await search(v ?? '')
  if (mine === seq) {
    results.value = r
    searching.value = false
  }
})
const shown = computed(() => q.value ? results.value : [...new Set([props.guess, ...(props.current ? [props.current] : []), ...IDEAS])])
function choose(icon: string | null) {
  emit('pick', icon)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 6px;
}
.icon-cell {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.03);
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}
.icon-cell:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}
.icon-cell--on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.18);
  color: rgb(var(--v-theme-primary));
}
.min-w-0 {
  min-width: 0;
}
</style>
