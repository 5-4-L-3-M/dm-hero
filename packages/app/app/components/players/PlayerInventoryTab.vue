<template>
  <div class="pa-2">
    <v-progress-linear v-if="loading && !inventory" indeterminate class="mb-3" />

    <template v-else-if="inventory">
      <PlayerPurse ref="purseRef" :player-id="playerId" />

      <!-- Load summary -->
      <v-card variant="tonal" class="pa-4 mb-4">
        <div class="d-flex align-center flex-wrap ga-3 mb-3">
          <div>
            <div class="text-body-small text-medium-emphasis">{{ $t('inventory.carrying') }}</div>
            <div class="text-headline-small font-weight-bold">
              {{ formatWeight(carried) || `0 ${weightUnit}` }}
              <span v-if="inventory.thresholds" class="text-title-medium text-medium-emphasis font-weight-regular">
                / {{ formatWeight(inventory.thresholds.capacity) }}
              </span>
            </div>
          </div>
          <v-spacer />
          <v-chip :color="loadStatusColor(status)" variant="flat" :prepend-icon="loadStatusIcon(status)">
            {{ $t(`inventory.status.${status}`) }}
          </v-chip>
        </div>

        <CarryLoadBar :carried="carried" :thresholds="inventory.thresholds" :status="status" />

        <div v-if="status === 'encumbered' || status === 'heavy' || status === 'over'" class="text-body-medium mt-3">
          <v-icon size="small" class="mr-1" :color="loadStatusColor(status)">mdi-information</v-icon>
          {{ $t(`inventory.effect.${status}`) }}
        </div>

        <v-alert
          v-if="!inventory.thresholds"
          type="info"
          variant="tonal"
          density="compact"
          class="mt-3"
          :text="$t('inventory.noStrength')"
        />
        <div v-else class="text-body-small text-medium-emphasis mt-2">
          {{ $t('inventory.basedOnStrength', { str: inventory.strength }) }}
          <div v-if="capacityBreakdown" class="mt-1">
            <v-icon size="x-small" class="mr-1">mdi-weight</v-icon>
            {{ $t('inventory.capacityWithBonus', { breakdown: capacityBreakdown }) }}
          </div>
        </div>
      </v-card>

      <!-- Item table -->
      <v-table v-if="inventory.items.length > 0" density="comfortable" class="inventory-table">
        <thead>
          <tr>
            <th>{{ $t('inventory.columns.item') }}</th>
            <th class="text-center">{{ $t('inventory.columns.qty') }}</th>
            <th class="text-right">{{ $t('inventory.columns.weightEach') }}</th>
            <th class="text-right">{{ $t('inventory.columns.total') }}</th>
            <th class="text-center">{{ $t('inventory.columns.equipped') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in inventory.items" :key="row.relation_id">
            <td>
              <div class="d-flex align-center py-1">
                <v-avatar size="36" rounded="lg" class="mr-3" :color="row.image_url ? undefined : 'surface-variant'">
                  <v-img v-if="row.image_url" :src="`/uploads/${row.image_url}`" />
                  <v-icon v-else :icon="getItemTypeIcon(row.item_type)" size="20" />
                </v-avatar>
                <div class="min-width-0">
                  <div class="font-weight-medium">{{ row.name }}</div>
                  <div v-if="row.text" class="text-body-small text-medium-emphasis text-truncate" style="max-width: 220px">
                    {{ row.text }}
                  </div>
                </div>
              </div>
            </td>
            <td class="text-center text-no-wrap">
              <v-btn
                icon="mdi-minus"
                size="x-small"
                variant="text"
                :disabled="row.quantity <= 1"
                :aria-label="$t('inventory.decrease')"
                @click="setQuantity(row, row.quantity - 1)"
              />
              <span class="qty-value">{{ row.quantity }}</span>
              <v-btn
                icon="mdi-plus"
                size="x-small"
                variant="text"
                :aria-label="$t('inventory.increase')"
                @click="setQuantity(row, row.quantity + 1)"
              />
            </td>
            <td class="text-right">
              <v-text-field
                :model-value="weightInputs[row.relation_id]"
                type="number"
                min="0"
                step="0.1"
                :suffix="weightUnit"
                :placeholder="$t('inventory.noWeight')"
                density="compact"
                variant="outlined"
                hide-details
                class="weight-input ml-auto"
                @update:model-value="weightInputs[row.relation_id] = $event"
                @change="saveWeight(row)"
                @keyup.enter="saveWeight(row)"
              />
            </td>
            <td class="text-right text-no-wrap font-weight-medium">
              {{ row.weight === null ? '—' : formatWeight(row.weight * row.quantity) }}
            </td>
            <td class="text-center">
              <v-checkbox-btn
                :model-value="row.equipped"
                class="d-inline-flex"
                @update:model-value="setEquipped(row, !!$event)"
              />
            </td>
            <td class="text-right">
              <v-btn
                icon="mdi-close"
                size="small"
                variant="text"
                color="error"
                :aria-label="$t('inventory.removeItem')"
                @click="removeRow(row)"
              />
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="font-weight-bold">{{ $t('inventory.columns.total') }}</td>
            <td class="text-right font-weight-bold text-no-wrap">{{ formatWeight(carried) || `0 ${weightUnit}` }}</td>
            <td colspan="2" />
          </tr>
        </tfoot>
      </v-table>

      <v-empty-state
        v-else
        icon="mdi-bag-personal-outline"
        :title="$t('inventory.empty')"
        :text="$t('inventory.emptyText')"
      />

      <v-alert
        v-if="missingWeights > 0"
        type="warning"
        variant="tonal"
        density="compact"
        class="mt-3"
        :text="$t('inventory.missingWeights', { count: missingWeights }, missingWeights)"
      />

      <!-- Add item -->
      <div class="d-flex align-center flex-wrap ga-2 mt-4">
        <v-autocomplete
          v-model="addItemId"
          :items="availableItems"
          item-title="name"
          item-value="id"
          :label="$t('inventory.addItem')"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          class="flex-grow-1"
          style="min-width: 220px"
        />
        <v-text-field
          v-model.number="addQuantity"
          type="number"
          min="1"
          :label="$t('inventory.columns.qty')"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 96px"
        />
        <v-btn color="primary" prepend-icon="mdi-plus" :disabled="!addItemId" :loading="adding" @click="addItem">
          {{ $t('common.add') }}
        </v-btn>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import CarryLoadBar from '~/components/players/CarryLoadBar.vue'
import PlayerPurse from '~/components/players/PlayerPurse.vue'
import {
  loadStatus,
  serializeInventoryNotes,
  totalCarried,
  type InventoryEntry,
  type PlayerInventory,
} from '~~/types/inventory'

const props = defineProps<{ playerId: number }>()
const emit = defineEmits<{ changed: [] }>()

const entitiesStore = useEntitiesStore()
const campaignStore = useCampaignStore()
const snackbarStore = useSnackbarStore()
const { t } = useI18n()
const { getItemTypeIcon } = useEntityIcons()
const { weightUnit, formatWeight, weightToDisplay, weightFromDisplay } = useUnits()

const inventory = ref<PlayerInventory | null>(null)
const purseRef = ref<{ reload: () => Promise<void> } | null>(null)
const loading = ref(false)
const adding = ref(false)
const addItemId = ref<number | null>(null)
const addQuantity = ref(1)
/** What is shown in each weight box (display unit), keyed by relation id */
const weightInputs = ref<Record<number, number | string | null>>({})

const carried = computed(() => totalCarried(inventory.value?.items ?? []))
const status = computed(() => loadStatus(carried.value, inventory.value?.strength ?? null, inventory.value?.thresholds?.bonus ?? 0))

/** "165 + 15 lb" when a carry bonus is set, empty otherwise */
const capacityBreakdown = computed(() => {
  const th = inventory.value?.thresholds
  if (!th || !th.bonus) return ''
  const base = weightToDisplay(th.capacity - th.bonus) ?? 0
  const bonus = weightToDisplay(Math.abs(th.bonus)) ?? 0
  const fmt = (n: number) => Number(n.toFixed(2))
  return `${fmt(base)} ${th.bonus > 0 ? '+' : '−'} ${fmt(bonus)} ${weightUnit.value}`
})
const missingWeights = computed(() => inventory.value?.items.filter(i => i.weight === null).length ?? 0)

const availableItems = computed(() =>
  (entitiesStore.items ?? [])
    .filter(i => !i.archived_at)
    .map(i => ({ id: i.id, name: i.name }))
    .sort((a, b) => a.name.localeCompare(b.name)),
)

function syncWeightInputs() {
  const next: Record<number, number | null> = {}
  for (const row of inventory.value?.items ?? []) next[row.relation_id] = weightToDisplay(row.weight)
  weightInputs.value = next
}

async function load() {
  if (!props.playerId) return
  loading.value = true
  try {
    inventory.value = await $fetch<PlayerInventory>(`/api/players/${props.playerId}/inventory`)
    syncWeightInputs()
  }
  catch (error) {
    console.error('Failed to load inventory:', error)
    inventory.value = null
  }
  finally {
    loading.value = false
  }
}

watch(() => props.playerId, load, { immediate: true })

onMounted(async () => {
  const campaignId = campaignStore.activeCampaignId
  if (campaignId && (!entitiesStore.items || entitiesStore.items.length === 0)) {
    await entitiesStore.fetchItems(campaignId)
  }
})

async function saveNotes(row: InventoryEntry) {
  await $fetch(`/api/entity-relations/${row.relation_id}`, {
    method: 'PATCH',
    body: {
      relationType: row.relation_type,
      notes: serializeInventoryNotes({ quantity: row.quantity, equipped: row.equipped, text: row.text }),
    },
  })
  emit('changed')
}

async function setQuantity(row: InventoryEntry, quantity: number) {
  if (quantity < 1) return
  const previous = row.quantity
  row.quantity = quantity
  try {
    await saveNotes(row)
  }
  catch (error) {
    row.quantity = previous
    console.error('Failed to update quantity:', error)
    snackbarStore.error(t('inventory.saveError'))
  }
}

async function setEquipped(row: InventoryEntry, equipped: boolean) {
  const previous = row.equipped
  row.equipped = equipped
  try {
    await saveNotes(row)
  }
  catch (error) {
    row.equipped = previous
    console.error('Failed to update equipped:', error)
    snackbarStore.error(t('inventory.saveError'))
  }
}

async function saveWeight(row: InventoryEntry) {
  const shown = weightInputs.value[row.relation_id]
  const shownNumber = shown === '' || shown === null || shown === undefined ? null : Number(shown)
  // Unchanged → nothing to do (avoids rounding drift between lb and kg)
  if (shownNumber === weightToDisplay(row.weight)) return
  const pounds = weightFromDisplay(shownNumber)
  if (shownNumber !== null && pounds === null) return // not a valid number — leave it
  try {
    await $fetch(`/api/items/${row.item_id}/weight`, { method: 'PATCH', body: { weight: pounds } })
    // Weight belongs to the item, so every row of the same item changes
    for (const r of inventory.value?.items ?? []) {
      if (r.item_id === row.item_id) {
        r.weight = pounds
        weightInputs.value[r.relation_id] = weightToDisplay(pounds)
      }
    }
    const stored = entitiesStore.items?.find(i => i.id === row.item_id)
    if (stored) stored.metadata = { ...(stored.metadata ?? {}), weight: pounds }
    emit('changed')
  }
  catch (error) {
    console.error('Failed to save weight:', error)
    snackbarStore.error(t('inventory.saveError'))
  }
}

async function removeRow(row: InventoryEntry) {
  try {
    await $fetch(`/api/entity-relations/${row.relation_id}`, { method: 'DELETE' })
    if (inventory.value) inventory.value.items = inventory.value.items.filter(r => r.relation_id !== row.relation_id)
    emit('changed')
  }
  catch (error) {
    console.error('Failed to remove item:', error)
    snackbarStore.error(t('inventory.saveError'))
  }
}

async function addItem() {
  if (!addItemId.value) return
  const quantity = Math.max(1, Math.floor(Number(addQuantity.value) || 1))
  // Already carrying it → just raise the quantity
  const existing = inventory.value?.items.find(r => r.item_id === addItemId.value)
  if (existing) {
    await setQuantity(existing, existing.quantity + quantity)
    addItemId.value = null
    addQuantity.value = 1
    return
  }
  adding.value = true
  try {
    await $fetch('/api/entity-relations', {
      method: 'POST',
      body: {
        fromEntityId: props.playerId,
        toEntityId: addItemId.value,
        relationType: 'carries',
        notes: { quantity, equipped: false },
      },
    })
    addItemId.value = null
    addQuantity.value = 1
    await load()
    emit('changed')
  }
  catch (error) {
    console.error('Failed to add item:', error)
    snackbarStore.error(t('inventory.saveError'))
  }
  finally {
    adding.value = false
  }
}

defineExpose({ reload: () => Promise.all([load(), purseRef.value?.reload()]) })
</script>

<style scoped>
.weight-input {
  max-width: 120px;
  min-width: 96px;
}
.qty-value {
  display: inline-block;
  min-width: 2ch;
  text-align: center;
  font-weight: 500;
}
.min-width-0 {
  min-width: 0;
}
.inventory-table :deep(td) {
  vertical-align: middle;
}
</style>
