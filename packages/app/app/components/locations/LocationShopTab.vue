<template>
  <div class="pa-2">
    <div class="d-flex align-center mb-3 ga-2">
      <div class="text-body-medium text-medium-emphasis">{{ $t('shop.count', { n: items.length }) }}</div>
      <v-spacer />
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openNew">
        {{ $t('shop.addItem') }}
      </v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-2" />

    <v-table v-if="sorted.length > 0" density="comfortable">
      <thead>
        <tr>
          <th>{{ $t('shop.fields.name') }}</th>
          <th class="text-right">{{ $t('shop.fields.weight') }}</th>
          <th class="text-right">{{ $t('shop.fields.cost') }}</th>
          <th class="text-center">{{ $t('shop.fields.stock') }}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in sorted" :key="row.id">
          <td>
            <div class="py-2">
              <div class="d-flex align-center flex-wrap ga-2">
                <span class="font-weight-medium">{{ row.name }}</span>
                <v-chip v-if="row.category" size="x-small" label variant="tonal" :color="CATEGORY_COLORS[row.category]">
                  {{ $t(`shop.categories.${row.category}`) }}
                </v-chip>
              </div>
              <div v-if="row.description" class="text-body-small text-medium-emphasis shop-desc">{{ row.description }}</div>
            </div>
          </td>
          <td class="text-right text-no-wrap">{{ row.weight !== null ? formatWeight(row.weight) : '—' }}</td>
          <td class="text-right text-no-wrap">{{ priceLabel(row) }}</td>
          <td class="text-center">{{ row.stock ?? '∞' }}</td>
          <td class="text-right text-no-wrap">
            <v-btn
              icon="mdi-cart-plus"
              size="small"
              variant="text"
              color="primary"
              :title="$t('shop.addToInventory')"
              :disabled="row.stock === 0"
              @click="openSell(row)"
            />
            <v-btn icon="mdi-pencil" size="small" variant="text" :title="$t('common.edit')" @click="openEdit(row)" />
            <v-btn icon="mdi-delete" size="small" variant="text" color="error" :title="$t('common.delete')" @click="remove(row)" />
          </td>
        </tr>
      </tbody>
    </v-table>

    <div v-else-if="!loading" class="text-center text-medium-emphasis py-8">
      <v-icon size="48" class="mb-2">mdi-store-outline</v-icon>
      <div class="text-title-medium">{{ $t('shop.empty') }}</div>
      <div class="text-body-medium">{{ $t('shop.emptyHint') }}</div>
    </div>

    <!-- Add / edit an item -->
    <v-dialog v-model="editOpen" max-width="600">
      <v-card :title="form.id ? $t('shop.editItem') : $t('shop.addItem')">
        <v-card-text>
          <v-autocomplete
            v-if="!form.id"
            v-model="copyFromItemId"
            :items="availableItems"
            item-title="name"
            item-value="id"
            :label="$t('shop.fromItems')"
            :hint="$t('shop.fromItemsHint')"
            persistent-hint
            prepend-inner-icon="mdi-treasure-chest"
            clearable
            variant="outlined"
            density="comfortable"
            class="mb-4"
            @update:model-value="copyFromItem"
          />
          <v-text-field v-model="form.name" :label="$t('shop.fields.name')" variant="outlined" density="comfortable" />
          <v-textarea
            v-model="form.description"
            :label="$t('shop.fields.description')"
            rows="2"
            auto-grow
            variant="outlined"
            density="comfortable"
          />
          <v-row dense>
            <v-col cols="6">
              <v-select
                v-model="form.category"
                :items="categoryOptions"
                :label="$t('shop.fields.category')"
                clearable
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="form.weight"
                :label="$t('shop.fields.weight')"
                :suffix="weightUnit"
                type="number"
                min="0"
                step="0.1"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="4">
              <v-text-field
                v-model.number="form.priceAmount"
                :label="$t('shop.fields.cost')"
                type="number"
                min="0"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="3">
              <v-select v-model="form.priceCode" :items="coinCodes" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="5">
              <v-text-field
                v-model="form.priceNote"
                :label="$t('shop.fields.priceNote')"
                :placeholder="$t('shop.fields.priceNoteHint')"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="form.stock"
                :label="$t('shop.fields.stock')"
                :hint="$t('shop.fields.stockHint')"
                persistent-hint
                type="number"
                min="0"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="editOpen = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" :disabled="!form.name.trim()" @click="save">
            {{ $t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Sell to a character -->
    <v-dialog v-model="sellOpen" max-width="500">
      <v-card v-if="selling" :title="$t('shop.sellTitle', { name: selling.name })">
        <v-card-text>
          <v-select
            v-model="sell.playerId"
            :items="playerOptions"
            item-title="name"
            item-value="id"
            :label="$t('shop.sellTo')"
            variant="outlined"
            density="comfortable"
          />
          <v-row dense>
            <v-col cols="4">
              <v-text-field
                v-model.number="sell.quantity"
                :label="$t('shop.quantity')"
                type="number"
                min="1"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="5">
              <v-text-field
                v-model.number="sell.priceAmount"
                :label="$t('shop.priceEach')"
                type="number"
                min="0"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="3">
              <v-select v-model="sell.priceCode" :items="coinCodes" variant="outlined" density="comfortable" />
            </v-col>
          </v-row>
          <v-switch v-model="sell.charge" :label="$t('shop.charge')" color="primary" hide-details density="compact" />

          <v-alert
            v-if="sell.playerId && purse"
            :type="sell.charge && !purseAfter ? 'error' : 'info'"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            <div>{{ $t('shop.totalCost') }}: <strong>{{ formatCoins(saleTotal, denominations) }}</strong></div>
            <div>{{ $t('shop.purseNow') }}: {{ formatCoins(purseTotal(purse, denominations), denominations) }}</div>
            <div v-if="sell.charge && purseAfter">
              {{ $t('shop.purseAfter') }}: <strong>{{ formatCoins(purseTotal(purseAfter, denominations), denominations) }}</strong>
            </div>
            <div v-else-if="sell.charge">{{ $t('shop.notEnough') }}</div>
          </v-alert>
          <div v-if="!selling.item_id" class="text-body-small text-medium-emphasis mt-2">{{ $t('shop.customNote') }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="sellOpen = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" :disabled="!canSell" @click="confirmSell">
            {{ $t('shop.addToInventory') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  bestUnit,
  formatCoins,
  payFromPurse,
  purseTotal,
  toBaseUnits,
  type Denomination,
  type Purse,
} from '~~/types/coins'
import {
  isShopCategory,
  SHOP_CATEGORIES,
  sortShopItems,
  type ShopCategory,
  type ShopItem,
  type ShopSaleResult,
} from '~~/types/shop'

const props = defineProps<{ locationId: number }>()

const { t } = useI18n()
const entitiesStore = useEntitiesStore()
const campaignStore = useCampaignStore()
const snackbarStore = useSnackbarStore()
const { weightUnit, formatWeight, weightToDisplay, weightFromDisplay } = useUnits()

const CATEGORY_COLORS: Record<ShopCategory, string> = {
  gear: 'grey',
  common: 'blue-grey',
  uncommon: 'green',
  rare: 'blue',
  very_rare: 'purple',
  legendary: 'orange',
  lore: 'amber-darken-2',
}

interface CurrencyRow {
  id: number
  code: string
  exchange_rate: number
  is_default: number
}

const items = ref<ShopItem[]>([])
const currencies = ref<CurrencyRow[]>([])
const loading = ref(false)
const saving = ref(false)

const sorted = computed(() => sortShopItems(items.value))
const denominations = computed<Denomination[]>(() =>
  currencies.value
    .map(c => ({ code: c.code, rate: c.exchange_rate, isDefault: c.is_default === 1 }))
    .sort((a, b) => b.rate - a.rate),
)
const coinCodes = computed(() => denominations.value.map(d => d.code))
const mainCode = computed(() => denominations.value.find(d => d.isDefault)?.code ?? coinCodes.value[0] ?? 'GP')
const categoryOptions = computed(() => SHOP_CATEGORIES.map(c => ({ value: c, title: t(`shop.categories.${c}`) })))
const availableItems = computed(() =>
  (entitiesStore.items ?? [])
    .filter(i => !i.archived_at)
    .map(i => ({ id: i.id, name: i.name }))
    .sort((a, b) => a.name.localeCompare(b.name)),
)
const playerOptions = computed(() =>
  (entitiesStore.players ?? []).map(p => ({ id: p.id, name: p.name })).sort((a, b) => a.name.localeCompare(b.name)),
)

function priceLabel(row: ShopItem): string {
  const note = row.price_note ?? ''
  if (row.price_cp === null) return note || '—'
  if (row.price_cp === 0) return note ? `${t('shop.free')} ${note}` : t('shop.free')
  return [formatCoins(row.price_cp, denominations.value), note].filter(Boolean).join(' ')
}

async function load() {
  const campaignId = campaignStore.activeCampaignIdNumber
  loading.value = true
  try {
    const [shop, coins] = await Promise.all([
      $fetch<ShopItem[]>(`/api/locations/${props.locationId}/shop`),
      campaignId ? $fetch<CurrencyRow[]>('/api/currencies', { query: { campaignId } }) : Promise.resolve([]),
    ])
    items.value = shop
    currencies.value = coins
  }
  catch (error) {
    console.error('Failed to load shop:', error)
  }
  finally {
    loading.value = false
  }
}

// ---- Add / edit ----
const editOpen = ref(false)
const copyFromItemId = ref<number | null>(null)
const form = ref(blankForm())

function blankForm() {
  return {
    id: null as number | null,
    item_id: null as number | null,
    name: '',
    description: '',
    category: null as ShopCategory | null,
    weight: null as number | null,
    priceAmount: null as number | null,
    priceCode: 'GP',
    priceNote: '',
    stock: null as number | null,
  }
}

function openNew() {
  form.value = { ...blankForm(), priceCode: mainCode.value }
  copyFromItemId.value = null
  editOpen.value = true
}

function openEdit(row: ShopItem) {
  const price = row.price_cp === null ? null : bestUnit(row.price_cp, denominations.value)
  form.value = {
    id: row.id,
    item_id: row.item_id,
    name: row.name,
    description: row.description ?? '',
    category: row.category,
    weight: weightToDisplay(row.weight),
    priceAmount: price?.amount ?? null,
    priceCode: price?.code ?? mainCode.value,
    priceNote: row.price_note ?? '',
    stock: row.stock,
  }
  editOpen.value = true
}

function copyFromItem(id: number | null) {
  const item = (entitiesStore.items ?? []).find(i => i.id === id)
  if (!item) {
    form.value.item_id = null
    return
  }
  const meta = (item.metadata ?? {}) as Record<string, unknown>
  const currency = currencies.value.find(c => c.id === meta.currency_id)
  const firstParagraph = (item.description ?? '').split(/\n\s*\n/)[0]?.trim() ?? ''
  form.value = {
    ...form.value,
    item_id: item.id,
    name: item.name,
    description: firstParagraph.length > 240 ? `${firstParagraph.slice(0, 237)}...` : firstParagraph,
    category: isShopCategory(meta.rarity) ? meta.rarity : 'gear',
    weight: typeof meta.weight === 'number' ? weightToDisplay(meta.weight) : form.value.weight,
    priceAmount: typeof meta.value === 'number' ? meta.value : form.value.priceAmount,
    priceCode: currency?.code ?? mainCode.value,
  }
}

function numberOrNull(value: unknown): number | null {
  return value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
}

async function save() {
  const f = form.value
  const amount = numberOrNull(f.priceAmount)
  const body = {
    name: f.name,
    description: f.description,
    category: f.category,
    weight: weightFromDisplay(numberOrNull(f.weight)),
    price_cp: amount === null ? null : toBaseUnits(amount, f.priceCode, denominations.value),
    price_note: f.priceNote,
    stock: numberOrNull(f.stock),
    item_id: f.item_id,
  }
  saving.value = true
  try {
    if (f.id) await $fetch(`/api/shop-items/${f.id}`, { method: 'PATCH', body })
    else await $fetch(`/api/locations/${props.locationId}/shop`, { method: 'POST', body })
    editOpen.value = false
    await load()
  }
  catch (error) {
    console.error('Failed to save shop item:', error)
    snackbarStore.error(t('shop.saveError'))
  }
  finally {
    saving.value = false
  }
}

async function remove(row: ShopItem) {
  if (!window.confirm(t('shop.confirmDelete', { name: row.name }))) return
  await $fetch(`/api/shop-items/${row.id}`, { method: 'DELETE' })
  await load()
}

// ---- Sell to a character ----
const sellOpen = ref(false)
const selling = ref<ShopItem | null>(null)
const purse = ref<Purse | null>(null)
const sell = ref({ playerId: null as number | null, quantity: 1, priceAmount: 0, priceCode: 'GP', charge: true })

const saleTotal = computed(() =>
  toBaseUnits(Number(sell.value.priceAmount) || 0, sell.value.priceCode, denominations.value)
  * Math.max(1, Math.floor(Number(sell.value.quantity) || 1)),
)
const purseAfter = computed(() => (purse.value ? payFromPurse(purse.value, saleTotal.value, denominations.value) : null))
const canSell = computed(() => {
  const s = sell.value
  if (!selling.value || !s.playerId || !(Number(s.quantity) >= 1)) return false
  if (selling.value.stock !== null && selling.value.stock < Number(s.quantity)) return false
  return !s.charge || saleTotal.value === 0 || purseAfter.value !== null
})

function openSell(row: ShopItem) {
  const price = bestUnit(row.price_cp ?? 0, denominations.value)
  selling.value = row
  sell.value = { ...sell.value, quantity: 1, priceAmount: price.amount, priceCode: price.code, charge: true }
  sellOpen.value = true
  loadPurse()
}

async function loadPurse() {
  purse.value = null
  if (!sell.value.playerId) return
  const result = await $fetch<{ coins: Purse }>(`/api/players/${sell.value.playerId}/coins`)
  purse.value = result.coins
}

watch(() => sell.value.playerId, () => {
  if (sellOpen.value) loadPurse()
})

async function confirmSell() {
  if (!selling.value || !canSell.value) return
  const s = sell.value
  saving.value = true
  try {
    const result = await $fetch<ShopSaleResult>(`/api/shop-items/${selling.value.id}/sell`, {
      method: 'POST',
      body: {
        playerId: s.playerId,
        quantity: s.quantity,
        priceEachCp: toBaseUnits(Number(s.priceAmount) || 0, s.priceCode, denominations.value),
        charge: s.charge,
      },
    })
    const player = playerOptions.value.find(p => p.id === s.playerId)?.name ?? ''
    snackbarStore.success(
      result.paid_cp > 0
        ? t('shop.soldPaid', { name: player, paid: formatCoins(result.paid_cp, denominations.value) })
        : t('shop.sold', { name: player }),
    )
    sellOpen.value = false
    await load()
  }
  catch (error) {
    console.error('Failed to sell item:', error)
    const message = (error as { data?: { message?: string } })?.data?.message
    snackbarStore.error(message === 'Not enough coin' ? t('shop.notEnough') : t('shop.saveError'))
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  const campaignId = campaignStore.activeCampaignIdNumber
  if (campaignId) {
    entitiesStore.fetchItems(campaignId)
    entitiesStore.fetchPlayers(campaignId)
  }
})

watch(() => props.locationId, load, { immediate: true })
</script>

<style scoped>
.shop-desc {
  max-width: 420px;
  white-space: pre-line;
}
</style>
