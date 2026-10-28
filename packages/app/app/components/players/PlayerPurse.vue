<template>
  <v-card variant="tonal" class="pa-4 mb-4">
    <div class="d-flex align-center mb-3">
      <v-icon class="mr-2" color="amber-darken-2">mdi-cash-multiple</v-icon>
      <span class="text-title-medium font-weight-bold">{{ $t('purse.title') }}</span>
      <v-spacer />
      <span class="text-body-medium text-medium-emphasis">
        {{ $t('purse.total') }}: <strong>{{ formatCoins(total, denominations) }}</strong>
      </span>
    </div>
    <div class="d-flex flex-wrap ga-2">
      <v-text-field
        v-for="d in denominations"
        :key="d.code"
        v-model.number="coins[d.code]"
        :suffix="d.code.toLowerCase()"
        type="number"
        min="0"
        step="1"
        density="compact"
        variant="outlined"
        hide-details
        class="purse-input"
        @update:model-value="queueSave"
      />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { cleanPurse, formatCoins, purseTotal, type Denomination, type Purse } from '~~/types/coins'

const props = defineProps<{ playerId: number }>()
const emit = defineEmits<{ changed: [] }>()

const denominations = ref<Denomination[]>([])
const coins = ref<Purse>({})
const total = computed(() => purseTotal(cleanPurse(coins.value, denominations.value), denominations.value))
let saveTimer: ReturnType<typeof setTimeout> | null = null

async function load() {
  if (!props.playerId) return
  const result = await $fetch<{ coins: Purse, denominations: Denomination[] }>(`/api/players/${props.playerId}/coins`)
  denominations.value = result.denominations
  coins.value = { ...result.coins }
}

function queueSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 500)
}

async function save() {
  const result = await $fetch<{ coins: Purse }>(`/api/players/${props.playerId}/coins`, {
    method: 'PUT',
    body: { coins: cleanPurse(coins.value, denominations.value) },
  })
  coins.value = { ...result.coins }
  emit('changed')
}

watch(() => props.playerId, load, { immediate: true })
onBeforeUnmount(() => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    save()
  }
})

defineExpose({ reload: load })
</script>

<style scoped>
.purse-input {
  max-width: 120px;
  min-width: 96px;
}
</style>
