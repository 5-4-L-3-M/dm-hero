<template>
  <v-card variant="outlined" class="ship-card" :class="`side-${ship.side}`">
    <v-card-item class="pb-1">
      <template #prepend>
        <v-icon :color="ship.side === 'enemy' ? 'error' : 'primary'">mdi-sail-boat</v-icon>
      </template>
      <v-card-title class="text-wrap">{{ ship.name }}</v-card-title>
      <v-card-subtitle class="text-wrap">
        {{ $t(`naval.sides.${ship.side}`) }} · {{ $t('naval.sizeN', { n: d.size }) }} · AC {{ d.ac }} · {{ cond.speed }} ft
      </v-card-subtitle>
      <template #append>
        <v-btn icon="mdi-pencil" size="small" variant="text" @click="$emit('edit')" />
        <v-btn icon="mdi-delete" size="small" variant="text" @click="$emit('remove')" />
      </template>
    </v-card-item>

    <v-card-text class="pt-1">
      <!-- Hull -->
      <div class="d-flex align-center ga-2 mb-1">
        <span class="text-label-large">{{ $t('naval.hull') }}</span>
        <v-spacer />
        <span class="text-body-medium">{{ d.hull }} / {{ d.hullMax }}</span>
      </div>
      <v-progress-linear :model-value="pct(d.hull, d.hullMax)" :color="barColor(d.hull, d.hullMax)" height="10" rounded />
      <div class="d-flex align-center ga-1 mt-2">
        <v-text-field
          v-model.number="amount"
          type="number"
          density="compact"
          variant="outlined"
          hide-details
          class="amount"
          :label="$t('naval.amount')"
        />
        <v-btn size="small" color="error" variant="tonal" :disabled="!amount" @click="hit">{{ $t('naval.damage') }}</v-btn>
        <v-btn size="small" color="success" variant="tonal" :disabled="!amount" @click="mend">{{ $t('naval.repairHull') }}</v-btn>
      </div>

      <div v-if="chips.length" class="d-flex flex-wrap ga-1 mt-2">
        <v-chip v-for="c in chips" :key="c.text" size="x-small" :color="c.color" variant="flat">{{ c.text }}</v-chip>
      </div>

      <!-- Detailed: parts, helm, weapons, fires, repairs -->
      <template v-if="detailed">
        <v-divider class="my-3" />
        <div class="text-label-large mb-1">{{ $t('naval.parts') }}</div>
        <div v-for="(m, i) in d.masts" :key="`m${i}`" class="part-row">
          <span>{{ $t('naval.mastN', { n: i + 1 }) }}</span>
          <v-progress-linear :model-value="pct(m, PART_MAX.mast)" :color="barColor(m, PART_MAX.mast)" height="6" rounded />
          <span class="num">{{ m }}</span>
          <v-btn icon="mdi-minus" size="x-small" variant="text" :disabled="!amount" @click="partHit('mast', i)" />
          <v-btn icon="mdi-plus" size="x-small" variant="text" :disabled="!amount" @click="partMend('mast', i)" />
        </div>
        <div v-for="p in (['wheel', 'rudder'] as const)" :key="p" class="part-row">
          <span>{{ $t(`naval.${p}`) }}</span>
          <v-progress-linear :model-value="pct(d[p], PART_MAX[p])" :color="barColor(d[p], PART_MAX[p])" height="6" rounded />
          <span class="num">{{ d[p] }}</span>
          <v-btn icon="mdi-minus" size="x-small" variant="text" :disabled="!amount" @click="partHit(p)" />
          <v-btn icon="mdi-plus" size="x-small" variant="text" :disabled="!amount" @click="partMend(p)" />
        </div>
        <div class="text-body-small text-medium-emphasis mt-1">
          {{ $t('naval.helm') }}: {{ d.helmsman || '—' }} · {{ $t('naval.maneuver') }} {{ signed(maneuverBonus(d)) }}
          <span v-if="cond.halfMast"> ({{ $t('naval.disadvantage') }})</span>
        </div>

        <!-- Weapons -->
        <div class="d-flex align-center mt-3 mb-1">
          <span class="text-label-large">{{ $t('naval.weapons') }}</span>
          <v-spacer />
          <v-menu>
            <template #activator="{ props: mp }">
              <v-btn v-bind="mp" size="x-small" variant="tonal" prepend-icon="mdi-plus">{{ $t('common.add') }}</v-btn>
            </template>
            <v-list density="compact" max-height="320">
              <v-list-item v-for="w in WEAPON_PRESETS" :key="w.name" :title="w.name" :subtitle="w.damage" @click="addWeapon(w)" />
            </v-list>
          </v-menu>
        </div>
        <div v-for="w in d.weapons" :key="w.id" class="weapon-row">
          <div class="flex-grow-1 min-w-0">
            <div class="text-body-medium text-wrap">
              {{ w.count > 1 ? `${w.count}× ` : '' }}{{ w.name }}
              <span class="text-medium-emphasis">· {{ $t(`naval.mounts.${w.mount}`) }}</span>
            </div>
            <div class="text-body-small text-medium-emphasis text-wrap">{{ w.toHit }} · {{ w.damage }}<span v-if="w.notes"> · {{ w.notes }}</span></div>
          </div>
          <v-chip size="x-small" :color="stateColor(w.state)" variant="flat" @click="cycle(w)">
            {{ $t(`naval.weaponStates.${w.state}`) }}
          </v-chip>
          <v-btn size="x-small" variant="tonal" color="warning" :disabled="w.mount === 'hull'" @click="fire(w)">{{ $t('naval.fire') }}</v-btn>
          <v-menu>
            <template #activator="{ props: mp }">
              <v-btn v-bind="mp" icon="mdi-dots-vertical" size="x-small" variant="text" />
            </template>
            <v-list density="compact">
              <v-list-item :title="$t('naval.oneMore')" @click="changeCount(w, 1)" />
              <v-list-item :title="$t('naval.oneLess')" :disabled="w.count <= 1" @click="changeCount(w, -1)" />
              <v-list-item v-for="m in mounts" :key="m" :title="$t(`naval.mounts.${m}`)" @click="setMount(w, m)" />
              <v-list-item :title="$t('common.delete')" base-color="error" @click="removeWeapon(w)" />
            </v-list>
          </v-menu>
        </div>
        <div v-if="!d.weapons.length" class="text-body-small text-medium-emphasis">{{ $t('naval.noWeapons') }}</div>

        <!-- Fires -->
        <div class="d-flex align-center mt-3 mb-1">
          <span class="text-label-large">{{ $t('naval.fires') }}</span>
          <v-spacer />
          <v-btn v-for="s in fireSizes" :key="s" size="x-small" variant="tonal" color="deep-orange" class="ml-1" @click="addFire(s)">
            + {{ $t(`naval.fireSizes.${s}`) }}
          </v-btn>
        </div>
        <div v-for="f in d.fires" :key="f.id" class="weapon-row">
          <v-icon color="deep-orange" size="small">mdi-fire</v-icon>
          <span class="flex-grow-1">
            {{ $t(`naval.fireSizes.${f.size}`) }} · {{ FIRE_TABLE[f.size].dice }}/{{ $t('naval.roundShort') }}
            <span class="text-medium-emphasis">· {{ f.roundsLeft == null ? $t('naval.burning') : $t('naval.roundsLeft', { n: f.roundsLeft }) }}</span>
          </span>
          <v-btn size="x-small" variant="text" @click="removeFire(f.id)">{{ $t('naval.putOut') }}</v-btn>
        </div>

        <!-- Repairs -->
        <div class="d-flex align-center mt-3 mb-1">
          <span class="text-label-large">{{ $t('naval.repairs') }}</span>
          <v-spacer />
          <v-btn size="x-small" variant="tonal" prepend-icon="mdi-hammer-wrench" @click="showRepair = true">{{ $t('naval.repairCheck') }}</v-btn>
        </div>
        <div v-for="r in d.repairs" :key="r.id" class="weapon-row">
          <v-icon size="small">mdi-hammer-wrench</v-icon>
          <span class="flex-grow-1 text-wrap">
            {{ r.label }} · {{ r.note }}
            <span v-if="r.roundsLeft != null" class="text-medium-emphasis">· {{ $t('naval.roundsLeft', { n: r.roundsLeft }) }}</span>
          </span>
          <v-btn size="x-small" variant="text" @click="removeRepair(r.id)">{{ $t('naval.done') }}</v-btn>
        </div>
      </template>

      <div v-if="d.notes" class="text-body-small text-medium-emphasis mt-2 text-wrap">{{ d.notes }}</div>
    </v-card-text>

    <!-- Repair check calculator -->
    <v-dialog v-model="showRepair" max-width="420">
      <v-card :title="$t('naval.repairCheck')">
        <v-card-text>
          <v-text-field v-model="repair.label" :label="$t('naval.whatToFix')" variant="outlined" density="compact" />
          <v-text-field v-model.number="repair.total" type="number" :label="$t('naval.checkTotal')" variant="outlined" density="compact" :hint="$t('naval.repairHint')" persistent-hint />
          <v-switch v-model="repair.major" :label="$t('naval.majorRepair')" color="primary" density="compact" hide-details />
          <v-switch v-model="repair.master" :label="$t('naval.masterBosun')" color="primary" density="compact" hide-details />
          <v-alert variant="tonal" density="compact" class="mt-2" :type="repairResult.seconds < 0 ? 'error' : 'info'">
            {{ formatDuration(repairResult.seconds) }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showRepair = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="addRepair">{{ $t('common.add') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import {
  FIRE_TABLE, PART_MAX, WEAPON_PRESETS, formatDuration, maneuverBonus, newId, repairTime, rollDice, shipCondition,
  type EncounterShip, type FireSize, type ShipData, type ShipWeapon, type WeaponMount, type WeaponPreset, type WeaponState,
} from '~~/types/ship'

const props = defineProps<{ ship: EncounterShip, detailed: boolean }>()
const emit = defineEmits<{
  (e: 'save', data: ShipData): void
  (e: 'edit' | 'remove'): void
  (e: 'log', text: string): void
}>()
const { t } = useI18n()

const d = computed(() => props.ship.data)
const cond = computed(() => shipCondition(d.value))
const amount = ref<number | null>(null)
const mounts: WeaponMount[] = ['port', 'starboard', 'bow', 'mid', 'stern', 'hull']
const fireSizes: FireSize[] = ['minor', 'moderate', 'major']

const chips = computed(() => {
  const out: { text: string, color: string }[] = []
  if (cond.value.sinking) out.push({ text: t('naval.sinking'), color: 'error' })
  if (props.detailed && cond.value.disabled) out.push({ text: t('naval.disabled'), color: 'error' })
  else if (props.detailed && cond.value.halfMast) out.push({ text: t('naval.halfMast'), color: 'warning' })
  if (props.detailed && d.value.fires.length) out.push({ text: t('naval.onFire'), color: 'deep-orange' })
  return out
})

function save(patch: Partial<ShipData>) {
  emit('save', { ...d.value, ...patch })
}
const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v))
const pct = (v: number, max: number) => (max > 0 ? (v / max) * 100 : 0)
function barColor(v: number, max: number) {
  const p = pct(v, max)
  return p > 50 ? 'success' : p > 25 ? 'warning' : 'error'
}
const signed = (n: number) => (n >= 0 ? `+${n}` : String(n))

function hit() {
  save({ hull: clamp(d.value.hull - (amount.value || 0), d.value.hullMax) })
  amount.value = null
}
function mend() {
  save({ hull: clamp(d.value.hull + (amount.value || 0), d.value.hullMax) })
  amount.value = null
}
function partHit(part: 'mast' | 'wheel' | 'rudder', i = 0) {
  change(part, i, -(amount.value || 0))
}
function partMend(part: 'mast' | 'wheel' | 'rudder', i = 0) {
  change(part, i, amount.value || 0)
}
function change(part: 'mast' | 'wheel' | 'rudder', i: number, delta: number) {
  if (part === 'mast') {
    const masts = [...d.value.masts]
    masts[i] = clamp((masts[i] ?? 0) + delta, PART_MAX.mast)
    save({ masts })
  }
  else save({ [part]: clamp(d.value[part] + delta, PART_MAX[part]) })
  amount.value = null
}

// --- weapons -------------------------------------------------------------
function addWeapon(p: WeaponPreset) {
  save({ weapons: [...d.value.weapons, { id: newId(), name: p.name, mount: p.mount, count: 1, toHit: p.toHit, damage: p.damage, notes: p.notes, state: 0 }] })
}
function updateWeapon(w: ShipWeapon, patch: Partial<ShipWeapon>) {
  save({ weapons: d.value.weapons.map(x => (x.id === w.id ? { ...x, ...patch } : x)) })
}
const cycle = (w: ShipWeapon) => updateWeapon(w, { state: ((w.state + 1) % 3) as WeaponState })
const changeCount = (w: ShipWeapon, n: number) => updateWeapon(w, { count: Math.max(1, w.count + n) })
const setMount = (w: ShipWeapon, m: WeaponMount) => updateWeapon(w, { mount: m })
const removeWeapon = (w: ShipWeapon) => save({ weapons: d.value.weapons.filter(x => x.id !== w.id) })
function stateColor(s: WeaponState) {
  return s === 2 ? 'success' : s === 1 ? 'info' : 'grey'
}
function fire(w: ShipWeapon) {
  const r = rollDice(w.damage)
  const note = w.state === 2 ? '' : ` ${t('naval.notAimed')}`
  emit('log', `${props.ship.name}: ${w.name} → ${r.total} (${r.detail})${note}`)
  updateWeapon(w, { state: 0 })
}

// --- fires ---------------------------------------------------------------
function addFire(size: FireSize) {
  save({ fires: [...d.value.fires, { id: newId(), size, roundsLeft: d.value.deckhands ? FIRE_TABLE[size].rounds : null }] })
}
const removeFire = (id: string) => save({ fires: d.value.fires.filter(f => f.id !== id) })

// --- repairs -------------------------------------------------------------
const showRepair = ref(false)
const repair = reactive({ label: '', total: 10, major: false, master: false })
const repairResult = computed(() => repairTime(Number(repair.total) || 0, repair.major, repair.master))
function addRepair() {
  const r = repairResult.value
  const label = repair.label.trim() || t(repair.major ? 'naval.majorRepair' : 'naval.minorRepair')
  if (r.seconds === 0) emit('log', `${props.ship.name}: ${label} — ${t('naval.repairedNow')}`)
  else save({ repairs: [...d.value.repairs, { id: newId(), label, roundsLeft: r.rounds, note: formatDuration(r.seconds) }] })
  showRepair.value = false
  repair.label = ''
}
const removeRepair = (id: string) => save({ repairs: d.value.repairs.filter(r => r.id !== id) })
</script>

<style scoped>
.ship-card.side-ally { border-left: 4px solid rgb(var(--v-theme-primary)); }
.ship-card.side-enemy { border-left: 4px solid rgb(var(--v-theme-error)); }
.amount { max-width: 110px; }
.part-row { display: grid; grid-template-columns: 70px 1fr 36px auto auto; align-items: center; gap: 6px; font-size: 0.85rem; }
.part-row .num { text-align: right; }
.weapon-row { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.min-w-0 { min-width: 0; }
</style>
