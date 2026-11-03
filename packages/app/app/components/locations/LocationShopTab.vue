<template>
  <div class="pa-2">
    <div class="d-flex align-center mb-3 ga-2">
      <div class="text-body-medium text-medium-emphasis">{{ $t('shop.count', { n: items.length }) }}</div>
      <v-spacer />
      <v-btn
        :variant="showSecret ? 'flat' : 'tonal'"
        :color="showSecret ? 'primary' : undefined"
        prepend-icon="mdi-incognito"
        :title="$t('shop.blackMarket.toggleHint')"
        @click="showSecret = !showSecret"
      >
        {{ $t('shop.blackMarket.title') }}
        <v-chip v-if="secretCount" size="x-small" class="ml-2" variant="tonal">{{ secretCount }}</v-chip>
      </v-btn>
      <v-btn variant="tonal" prepend-icon="mdi-hand-coin" @click="openBuy">
        {{ $t('shop.buyFrom.button') }}
      </v-btn>
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openNew">
        {{ $t('shop.addItem') }}
      </v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-2" />

    <!-- Prices follow how this place (or its city) feels about the party -->
    <v-alert v-if="priceAdjust.pct" :type="priceAdjust.pct < 0 ? 'success' : 'warning'" variant="tonal" density="compact" class="mb-3">
      {{ $t(priceAdjust.pct < 0 ? 'reputation.price.cheaper' : 'reputation.price.dearer', { pct: Math.abs(priceAdjust.pct), from: priceAdjust.from, tier: $t(`reputation.tiers.${priceAdjust.tier}`) }) }}
    </v-alert>

    <template v-for="section in sections" :key="section.key">
      <div v-if="section.key === 'secret'" class="black-market-head d-flex align-center ga-2 mt-5 mb-1 px-2">
        <v-icon size="small">mdi-incognito</v-icon>
        <span class="font-weight-bold">{{ $t('shop.blackMarket.title') }}</span>
        <span class="text-body-small text-medium-emphasis">{{ $t('shop.blackMarket.hint') }}</span>
      </div>
      <div v-if="section.key === 'secret' && !section.items.length" class="text-body-small text-medium-emphasis px-2 pb-2">{{ $t('shop.blackMarket.empty') }}</div>
      <v-table v-if="section.items.length > 0" density="comfortable" :class="{ 'black-market': section.key === 'secret' }">
        <thead>
          <tr>
            <th class="icon-col" />
            <th>{{ $t('shop.fields.name') }}</th>
            <th class="text-right">{{ $t('shop.fields.weight') }}</th>
            <th class="text-right">{{ $t('shop.fields.cost') }}</th>
            <th class="text-center">{{ $t('shop.fields.stock') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in section.items" :key="row.id">
            <td class="icon-col">
              <!-- The item's picture, or its icon (click to change) -->
              <button type="button" class="item-icon" :title="$t('icons.change')" @click="openIconPicker(row)">
                <v-avatar size="46" rounded="lg" :color="CATEGORY_COLORS[row.category ?? 'gear']" variant="tonal">
                  <v-img v-if="row.item_image && !row.icon" :src="`/uploads/${row.item_image}`" cover />
                  <SharedGameIcon v-else :name="row.icon_shown" :size="34" />
                </v-avatar>
              </button>
            </td>
            <td>
              <div class="py-2">
                <div class="d-flex align-center flex-wrap ga-2">
                  <span class="font-weight-medium"><SharedEntityLink v-if="row.item_id" :id="row.item_id" type="item" :name="row.name" /><template v-else>{{ row.name }}</template></span>
                  <v-chip v-if="row.category" size="x-small" label variant="tonal" :color="CATEGORY_COLORS[row.category]">
                    {{ $t(`shop.categories.${row.category}`) }}
                  </v-chip>
                </div>
                <div v-if="row.requirement || row.req_subject_id" class="d-flex flex-wrap ga-1 mt-1">
                  <v-chip v-if="row.requirement" size="x-small" variant="outlined" prepend-icon="mdi-lock-outline">{{ row.requirement }}</v-chip>
                  <v-chip
                    v-if="row.req_subject_id && row.req_tier"
                    size="x-small"
                    variant="flat"
                    :color="row.req_met ? 'success' : 'error'"
                    :prepend-icon="row.req_met ? 'mdi-lock-open-variant' : 'mdi-lock'"
                    :title="row.req_met ? $t('shop.requirement.met') : $t('shop.requirement.notMet')"
                  >
                    {{ row.req_subject_name }} · {{ $t(`reputation.tiers.${row.req_tier}`) }}
                  </v-chip>
                </div>
                <div v-if="row.description" class="text-body-small text-medium-emphasis shop-desc">{{ row.description }}</div>
              </div>
            </td>
            <td class="text-right text-no-wrap">{{ row.weight !== null ? formatWeight(row.weight) : '—' }}</td>
            <td class="text-right text-no-wrap">
              <template v-if="priceAdjust.pct && row.price_cp">
                <span class="text-decoration-line-through text-medium-emphasis mr-1">{{ priceLabel(row) }}</span>
                <strong :class="priceAdjust.pct < 0 ? 'text-success' : 'text-warning'">{{ formatCoins(adjusted(row.price_cp), denominations) }}</strong>
              </template>
              <template v-else>{{ priceLabel(row) }}</template>
            </td>
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
    </template>

    <div v-if="!sorted.length && !loading" class="text-center text-medium-emphasis py-8">
      <v-icon size="48" class="mb-2">mdi-store-outline</v-icon>
      <div class="text-title-medium">{{ $t('shop.empty') }}</div>
      <div class="text-body-medium">{{ $t('shop.emptyHint') }}</div>
    </div>

    <SharedGameIconPicker
      v-model="iconPickerOpen"
      :item-name="iconRow?.name ?? ''"
      :current="iconRow?.icon ?? null"
      :guess="!iconRow ? 'swap-bag' : iconRow.icon ? guessShopIcon(iconRow.name, iconRow.category) : iconRow.icon_shown"
      @pick="saveIcon"
    />

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

          <!-- Under the counter, and what it takes to buy -->
          <v-switch v-model="form.secret" color="primary" density="compact" hide-details class="mt-2" prepend-icon="mdi-incognito" :label="$t('shop.blackMarket.switch')" />
          <v-text-field
            v-model="form.requirement"
            :label="$t('shop.requirement.label')"
            :placeholder="$t('shop.requirement.placeholder')"
            prepend-inner-icon="mdi-lock-outline"
            variant="outlined"
            density="comfortable"
            clearable
            class="mt-3"
          />
          <div class="text-body-small text-medium-emphasis mb-1">{{ $t('shop.requirement.repLock') }}</div>
          <v-row dense>
            <v-col cols="7">
              <v-autocomplete
                v-model="form.reqSubjectId"
                :items="repSubjects"
                item-title="name"
                item-value="id"
                :label="$t('shop.requirement.who')"
                variant="outlined"
                density="comfortable"
                clearable
                hide-details
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :subtitle="$t(`reputation.types.${item.type}`)" />
                </template>
              </v-autocomplete>
            </v-col>
            <v-col cols="5">
              <v-select
                v-model="form.reqTier"
                :items="tierOptions"
                :label="$t('shop.requirement.atLeast')"
                :disabled="!form.reqSubjectId"
                variant="outlined"
                density="comfortable"
                hide-details
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

    <!-- The shop buys from a character: coin into their purse, item onto the shelf -->
    <v-dialog v-model="buyOpen" max-width="620" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center"><v-icon class="mr-2">mdi-hand-coin</v-icon>{{ $t('shop.buyFrom.title') }}</v-card-title>
        <v-card-text style="max-height: 70vh">
          <v-select
            v-model="buy.playerId"
            :items="playerOptions"
            item-title="name"
            item-value="id"
            :label="$t('shop.buyFrom.who')"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mb-3"
          />
          <div v-if="buy.playerId && !offers.length" class="text-body-medium text-medium-emphasis">{{ $t('shop.buyFrom.nothing') }}</div>
          <v-list v-else-if="buy.playerId" density="compact" class="pa-0">
            <template v-for="o in offers" :key="o.relation_id">
              <v-list-item :active="buy.relationId === o.relation_id" rounded @click="pickOffer(o)">
                <v-list-item-title>{{ o.name }} <span v-if="o.quantity > 1" class="text-medium-emphasis">×{{ o.quantity }}</span></v-list-item-title>
                <v-list-item-subtitle>
                  <template v-if="o.offer_cp !== null">{{ $t('shop.buyFrom.offer', { offer: formatCoins(o.offer_cp, denominations), value: formatCoins(o.value_cp ?? 0, denominations) }) }}</template>
                  <template v-else>{{ $t('shop.buyFrom.noValue') }}</template>
                </v-list-item-subtitle>
                <template #append>
                  <v-icon v-if="o.equipped" size="small" class="text-medium-emphasis" :title="$t('shop.buyFrom.equipped')">mdi-shield-sword</v-icon>
                </template>
              </v-list-item>
              <div v-if="buy.relationId === o.relation_id" class="px-4 pb-3">
                <v-row dense class="mt-1">
                  <v-col cols="3">
                    <v-text-field v-model.number="buy.quantity" :label="$t('shop.quantity')" type="number" min="1" :max="o.quantity" variant="outlined" density="compact" hide-details />
                  </v-col>
                  <v-col cols="5">
                    <v-text-field v-model.number="buy.priceAmount" :label="$t('shop.priceEach')" type="number" min="0" variant="outlined" density="compact" hide-details />
                  </v-col>
                  <v-col cols="4">
                    <v-select v-model="buy.priceCode" :items="coinCodes" variant="outlined" density="compact" hide-details />
                  </v-col>
                </v-row>
                <v-switch v-model="buy.addToStock" :label="$t('shop.buyFrom.toShelf')" color="primary" density="compact" hide-details />
                <div class="d-flex align-center mt-1">
                  <span class="text-body-medium">{{ $t('shop.buyFrom.theyGet') }} <strong>{{ formatCoins(buyTotal, denominations) }}</strong></span>
                  <v-spacer />
                  <v-btn color="primary" variant="flat" :loading="saving" prepend-icon="mdi-hand-coin" @click="confirmBuy">{{ $t('shop.buyFrom.confirm') }}</v-btn>
                </div>
              </div>
            </template>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="buyOpen = false">{{ $t('common.close') }}</v-btn>
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
import { guessShopIcon } from '~~/types/shopIcons'
import { tiersFor, type RepSubjectType } from '~~/types/reputation'

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
// On the shelf, then under the counter (black market)
const sections = computed(() => [
  { key: 'shelf', items: sorted.value.filter(i => !i.secret) },
  { key: 'secret', items: sorted.value.filter(i => i.secret) },
].filter(x => x.key === 'shelf' || showSecret.value))
// Black market toggle: shows what's under the counter; new items added meanwhile go there too
const showSecret = ref(false)
const secretCount = computed(() => items.value.filter(i => i.secret).length)
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

// --- icons ---------------------------------------------------------------
const iconPickerOpen = ref(false)
const iconRow = ref<ShopItem | null>(null)
function openIconPicker(row: ShopItem) {
  iconRow.value = row
  iconPickerOpen.value = true
}
async function saveIcon(icon: string | null) {
  if (!iconRow.value) return
  await $fetch(`/api/shop-items/${iconRow.value.id}`, { method: 'PATCH', body: { icon } })
  await load()
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
    secret: false,
    requirement: '' as string | null,
    reqSubjectId: null as number | null,
    reqTier: null as string | null,
  }
}

function openNew() {
  form.value = { ...blankForm(), priceCode: mainCode.value, secret: showSecret.value }
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
    secret: row.secret,
    requirement: row.requirement ?? '',
    reqSubjectId: row.req_subject_id,
    reqTier: row.req_tier,
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
    secret: f.secret,
    requirement: f.requirement ?? null,
    req_subject_id: f.reqSubjectId,
    req_tier: f.reqSubjectId ? f.reqTier : null,
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

const priceAdjust = ref<{ pct: number, tier: string | null, from: string | null }>({ pct: 0, tier: null, from: null })
async function loadPriceAdjust() {
  const campaignId = campaignStore.activeCampaignIdNumber
  if (!campaignId) return
  priceAdjust.value = await $fetch<typeof priceAdjust.value>('/api/reputation/price', { query: { campaignId, locationId: props.locationId } }).catch(() => ({ pct: 0, tier: null, from: null }))
}
watch(() => props.locationId, loadPriceAdjust, { immediate: true })
const adjusted = (cp: number) => Math.max(0, Math.round(cp * (1 + priceAdjust.value.pct / 100)))

function openSell(row: ShopItem) {
  const price = bestUnit(adjusted(row.price_cp ?? 0), denominations.value)
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

// ---- Reputation lock: who, and how much they must like the party ----
const story = useStoryBoardStore()
const repSubjects = computed(() => story.entities
  .filter(e => e.type === 'NPC' || e.type === 'Faction' || e.type === 'Location')
  .map(e => ({ id: e.id, name: e.name, type: e.type as RepSubjectType })))
const tierOptions = computed(() => {
  const subj = repSubjects.value.find(x => x.id === form.value.reqSubjectId)
  return subj ? tiersFor(subj.type).map(tier => ({ value: tier.key, title: t(`reputation.tiers.${tier.key}`) })).slice(1) : []
})
watch(() => form.value.reqSubjectId, () => {
  if (form.value.reqSubjectId && !tierOptions.value.some(o => o.value === form.value.reqTier)) form.value.reqTier = tierOptions.value.find(o => ['friendly', 'liked'].includes(o.value))?.value ?? null
})

// ---- Buy from a character (they sell their loot here) ----
interface SellOffer { relation_id: number, item_id: number, name: string, quantity: number, equipped: boolean, value_cp: number | null, offer_cp: number | null }
const buyOpen = ref(false)
const offers = ref<SellOffer[]>([])
const buy = ref({ playerId: null as number | null, relationId: null as number | null, quantity: 1, priceAmount: 0, priceCode: 'GP', addToStock: true })
const buyTotal = computed(() => toBaseUnits(Number(buy.value.priceAmount) || 0, buy.value.priceCode, denominations.value) * Math.max(1, Math.floor(Number(buy.value.quantity) || 1)))
function openBuy() {
  buy.value = { ...buy.value, relationId: null }
  buyOpen.value = true
  loadOffers()
}
async function loadOffers() {
  offers.value = []
  if (!buy.value.playerId) return
  const r = await $fetch<{ offers: SellOffer[] }>('/api/shop/offers', { query: { locationId: props.locationId, playerId: buy.value.playerId } }).catch(() => ({ offers: [] }))
  offers.value = r.offers
}
watch(() => buy.value.playerId, () => {
  buy.value.relationId = null
  if (buyOpen.value) loadOffers()
})
function pickOffer(o: SellOffer) {
  const price = bestUnit(o.offer_cp ?? 0, denominations.value)
  buy.value = { ...buy.value, relationId: o.relation_id, quantity: 1, priceAmount: price.amount, priceCode: price.code }
}
async function confirmBuy() {
  const b = buy.value
  if (!b.playerId || !b.relationId) return
  saving.value = true
  try {
    const r = await $fetch<{ paid_cp: number }>('/api/shop/buy', {
      method: 'POST',
      body: { locationId: props.locationId, playerId: b.playerId, relationId: b.relationId, quantity: b.quantity, priceEachCp: toBaseUnits(Number(b.priceAmount) || 0, b.priceCode, denominations.value), addToStock: b.addToStock },
    })
    const player = playerOptions.value.find(p => p.id === b.playerId)?.name ?? ''
    snackbarStore.success(t('shop.buyFrom.done', { name: player, paid: formatCoins(r.paid_cp, denominations.value) }))
    buy.value.relationId = null
    await Promise.all([loadOffers(), load()])
  }
  catch (error) {
    snackbarStore.error((error as { data?: { message?: string } })?.data?.message ?? t('shop.saveError'))
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  const campaignId = campaignStore.activeCampaignIdNumber
  story.load(campaignId)
  if (campaignId) {
    entitiesStore.fetchItems(campaignId)
    entitiesStore.fetchPlayers(campaignId)
  }
})

watch(() => props.locationId, load, { immediate: true })
</script>

<style scoped>
.icon-col {
  width: 62px;
  padding-right: 0 !important;
}
.item-icon {
  display: block;
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
}
.item-icon:hover {
  filter: brightness(1.2);
}
.black-market-head {
  border-top: 1px dashed rgba(var(--v-theme-on-surface), 0.25);
  padding-top: 12px;
}
.black-market {
  background: rgba(0, 0, 0, 0.28) !important;
  border-radius: 8px;
}
.shop-desc {
  max-width: 420px;
  white-space: pre-line;
}
</style>
