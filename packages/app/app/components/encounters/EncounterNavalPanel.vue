<template>
  <v-card v-if="ships.length || open" variant="tonal" class="mb-4 naval-panel">
    <v-card-item>
      <template #prepend>
        <v-icon>mdi-ferry</v-icon>
      </template>
      <v-card-title>{{ $t('naval.title') }}</v-card-title>
      <template #append>
        <div class="d-flex align-center ga-2 flex-wrap justify-end">
          <v-btn-toggle :model-value="detailed ? 'detailed' : 'simple'" density="compact" variant="outlined" mandatory @update:model-value="setDetailed($event === 'detailed')">
            <v-btn value="simple" size="small">{{ $t('naval.simple') }}</v-btn>
            <v-btn value="detailed" size="small">{{ $t('naval.detailed') }}</v-btn>
          </v-btn-toggle>
          <v-btn size="small" color="primary" prepend-icon="mdi-plus" @click="openAdd">{{ $t('naval.addShip') }}</v-btn>
        </div>
      </template>
    </v-card-item>

    <v-card-text>
      <div v-if="!ships.length" class="text-body-medium text-medium-emphasis">{{ $t('naval.empty') }}</div>

      <!-- Movement: pick both ships' moves, then resolve -->
      <v-card v-if="allies.length && enemies.length" variant="outlined" class="mb-3">
        <v-card-text>
          <div class="text-label-large mb-2">{{ $t('naval.movement') }}</div>
          <div class="move-grid">
            <template v-for="side in (['a', 'b'] as const)" :key="side">
              <div class="move-side">
                <v-select
                  v-model="pick[side].shipId"
                  :items="(side === 'a' ? allies : enemies).map(s => ({ title: s.name, value: s.id }))"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="mb-2"
                />
                <v-btn-toggle v-model="pick[side].move" density="compact" variant="outlined" divided :disabled="isStuck(side)">
                  <v-btn v-for="m in MOVES" :key="m" :value="m" size="small">{{ $t(`naval.moves.${m}`) }}</v-btn>
                </v-btn-toggle>
                <div v-if="isStuck(side)" class="text-body-small text-error mt-1">{{ $t('naval.cantManeuver') }}</div>
              </div>
            </template>
          </div>
          <div class="d-flex ga-2 mt-3">
            <v-btn color="primary" :disabled="!canResolve" prepend-icon="mdi-sail-boat" @click="resolve">{{ $t('naval.resolve') }}</v-btn>
            <v-spacer />
            <span v-if="detailed" class="text-body-small text-medium-emphasis align-self-center">{{ $t('naval.resolveTicks') }}</span>
          </div>

          <!-- Outcome -->
          <template v-if="outcome">
            <v-alert variant="tonal" density="compact" type="info" class="mt-3">{{ outcome.result.summary }}</v-alert>
            <div class="outcome-grid mt-2">
              <div v-for="side in (['a', 'b'] as const)" :key="side">
                <div class="text-label-large">{{ outcome[side].name }} · {{ $t(`naval.moves.${outcome[side].move}`) }}</div>
                <div class="d-flex flex-wrap ga-1 mt-1">
                  <v-chip v-for="c in sideChips(outcome.result[side])" :key="c.text" size="x-small" :color="c.color" variant="flat">{{ c.text }}</v-chip>
                </div>
                <div v-if="outcome.result[side].takesRam" class="mt-2">
                  <div class="text-body-small">
                    {{ $t('naval.ramDamage') }}: {{ ramDice(side) }} · {{ $t('naval.braceDc', { dc: outcome.result[side].takesRam!.braceDc }) }}
                  </div>
                  <v-btn size="x-small" color="error" variant="tonal" class="mt-1" :disabled="outcome.applied[side]" @click="applyRam(side)">
                    {{ outcome.applied[side] ? $t('naval.applied') : $t('naval.rollApply') }}
                  </v-btn>
                </div>
              </div>
            </div>
            <div v-if="outcome.result.contest" class="mt-2">
              <v-btn size="small" variant="tonal" prepend-icon="mdi-dice-d20" @click="contest">{{ $t('naval.rollManeuvers') }}</v-btn>
              <span v-if="outcome.contestText" class="text-body-medium ml-2">{{ outcome.contestText }}</span>
            </div>
          </template>
        </v-card-text>
      </v-card>

      <!-- Ships -->
      <div class="ship-grid">
        <EncountersEncounterShipCard
          v-for="s in ships"
          :key="s.id"
          :ship="s"
          :detailed="detailed"
          @save="data => saveShip(s, data)"
          @edit="openEdit(s)"
          @remove="removeShip(s)"
          @log="addLog"
        />
      </div>

      <!-- Log -->
      <v-expansion-panels v-if="log.length" variant="accordion" class="mt-3">
        <v-expansion-panel :title="$t('naval.log', { n: log.length })">
          <v-expansion-panel-text>
            <div v-for="(l, i) in [...log].reverse().slice(0, 30)" :key="i" class="text-body-small mb-1 text-wrap">{{ l }}</div>
            <v-btn size="x-small" variant="text" class="mt-1" @click="clearLog">{{ $t('naval.clearLog') }}</v-btn>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>

    <!-- Add / edit ship -->
    <v-dialog v-model="showForm" max-width="520">
      <v-card :title="editing ? $t('naval.editShip') : $t('naval.addShip')">
        <v-card-text>
          <v-text-field v-model="form.name" :label="$t('common.name')" variant="outlined" density="compact" autofocus />
          <v-btn-toggle v-model="form.side" density="compact" variant="outlined" mandatory class="mb-3">
            <v-btn value="ally">{{ $t('naval.sides.ally') }}</v-btn>
            <v-btn value="enemy">{{ $t('naval.sides.enemy') }}</v-btn>
          </v-btn-toggle>
          <v-select
            v-if="!editing"
            v-model="form.preset"
            :items="presetItems"
            :label="$t('naval.shipType')"
            variant="outlined"
            density="compact"
          />
          <v-row dense>
            <v-col cols="4"><v-text-field v-model.number="form.data.size" type="number" :label="$t('naval.size')" variant="outlined" density="compact" /></v-col>
            <v-col cols="4"><v-text-field v-model.number="form.data.ac" type="number" label="AC" variant="outlined" density="compact" /></v-col>
            <v-col cols="4"><v-text-field v-model.number="form.data.hullMax" type="number" :label="$t('naval.hullMax')" variant="outlined" density="compact" /></v-col>
            <template v-if="detailed">
              <v-col cols="4"><v-text-field v-model.number="form.data.agility" type="number" :label="$t('naval.agility')" variant="outlined" density="compact" /></v-col>
              <v-col cols="4"><v-text-field v-model.number="form.data.speed" type="number" :label="$t('naval.speed')" variant="outlined" density="compact" /></v-col>
              <v-col cols="4"><v-text-field v-model.number="mastCount" type="number" :label="$t('naval.masts')" variant="outlined" density="compact" /></v-col>
              <v-col cols="8"><v-text-field v-model="form.data.helmsman" :label="$t('naval.helmsman')" variant="outlined" density="compact" /></v-col>
              <v-col cols="4"><v-text-field v-model.number="form.data.helmBonus" type="number" :label="$t('naval.helmBonus')" :hint="$t('naval.helmBonusHint')" variant="outlined" density="compact" /></v-col>
            </template>
          </v-row>
          <v-switch v-if="detailed" v-model="form.data.deckhands" :label="$t('naval.deckhands')" color="primary" density="compact" hide-details />
          <v-textarea v-model="form.data.notes" :label="$t('common.notes')" variant="outlined" density="compact" rows="2" auto-grow class="mt-2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showForm = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!form.name.trim()" @click="submitForm">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import {
  FIRE_TABLE, MOVES, PART_MAX, SHIP_PRESETS, maneuverBonus, normalizeShip, resolveMoves, rollD20, rollDice, shipCondition, shipFromPreset,
  type EncounterShip, type Move, type RoundOutcome, type ShipData, type ShipSide, type SideOutcome,
} from '~~/types/ship'

const props = defineProps<{ encounterId: number, round: number, open?: boolean }>()
const { t } = useI18n()
const snackbarStore = useSnackbarStore()

const ships = ref<EncounterShip[]>([])
const detailed = ref(false)
const log = ref<string[]>([])
const allies = computed(() => ships.value.filter(s => s.side === 'ally'))
const enemies = computed(() => ships.value.filter(s => s.side === 'enemy'))

async function load() {
  try {
    const r = await $fetch<{ detailed: boolean, log: string[], ships: EncounterShip[] }>(`/api/naval/encounter/${props.encounterId}`)
    ships.value = r.ships
    detailed.value = r.detailed
    log.value = r.log
  }
  catch (e) {
    console.error('[naval] load failed', e)
  }
}
watch(() => props.encounterId, load, { immediate: true })

async function setDetailed(v: boolean) {
  detailed.value = v
  await $fetch(`/api/naval/encounter/${props.encounterId}`, { method: 'PATCH', body: { detailed: v } })
}
async function addLog(text: string) {
  log.value = [...log.value, text]
  await $fetch(`/api/naval/encounter/${props.encounterId}`, { method: 'PATCH', body: { log: log.value } })
}
async function clearLog() {
  log.value = []
  await $fetch(`/api/naval/encounter/${props.encounterId}`, { method: 'PATCH', body: { log: [] } })
}

async function saveShip(s: EncounterShip, data: ShipData) {
  const i = ships.value.findIndex(x => x.id === s.id)
  if (i >= 0) ships.value[i] = { ...s, data }
  const updated = await $fetch<EncounterShip>(`/api/naval/ships/${s.id}`, { method: 'PATCH', body: { data } })
  const j = ships.value.findIndex(x => x.id === s.id)
  if (j >= 0 && updated) ships.value[j] = updated
}
async function removeShip(s: EncounterShip) {
  await $fetch(`/api/naval/ships/${s.id}`, { method: 'DELETE' })
  ships.value = ships.value.filter(x => x.id !== s.id)
}

// --- add / edit form -------------------------------------------------------
const showForm = ref(false)
const editing = ref<EncounterShip | null>(null)
const form = reactive<{ name: string, side: ShipSide, preset: string, data: ShipData }>({
  name: '',
  side: 'ally',
  preset: 'buccaneer',
  data: shipFromPreset(SHIP_PRESETS[3]!),
})
const presetItems = SHIP_PRESETS.map(p => ({ title: `${p.name} (${t('naval.sizeN', { n: p.size })}, ${p.hull} hp, AC ${p.ac})`, value: p.key }))
watch(() => form.preset, (key) => {
  if (editing.value) return
  const p = SHIP_PRESETS.find(x => x.key === key)
  if (p) form.data = { ...shipFromPreset(p), notes: form.data.notes, helmsman: form.data.helmsman, helmBonus: form.data.helmBonus }
})
const mastCount = computed<number>({
  get: () => form.data.masts.length,
  set: (v) => {
    const n = Math.max(0, Math.min(8, Math.round(Number(v) || 0)))
    form.data.masts = Array.from({ length: n }, (_, i) => form.data.masts[i] ?? PART_MAX.mast)
  },
})
function openAdd() {
  editing.value = null
  form.name = ''
  form.side = 'ally'
  form.preset = 'buccaneer'
  form.data = shipFromPreset(SHIP_PRESETS[3]!)
  showForm.value = true
}
function openEdit(s: EncounterShip) {
  editing.value = s
  form.name = s.name
  form.side = s.side
  form.data = JSON.parse(JSON.stringify(s.data))
  showForm.value = true
}
async function submitForm() {
  const data = normalizeShip(form.data)
  data.hull = Math.min(data.hull, data.hullMax)
  if (!editing.value) data.hull = data.hullMax
  if (editing.value) {
    const updated = await $fetch<EncounterShip>(`/api/naval/ships/${editing.value.id}`, { method: 'PATCH', body: { name: form.name, side: form.side, data } })
    const i = ships.value.findIndex(x => x.id === editing.value!.id)
    if (i >= 0 && updated) ships.value[i] = updated
  }
  else {
    const created = await $fetch<EncounterShip>('/api/naval/ships', { method: 'POST', body: { encounterId: props.encounterId, name: form.name, side: form.side, data } })
    if (created) ships.value.push(created)
  }
  showForm.value = false
}

// --- movement ----------------------------------------------------------------
type Side = 'a' | 'b'
const pick = reactive<Record<Side, { shipId: number | null, move: Move | null }>>({
  a: { shipId: null, move: null },
  b: { shipId: null, move: null },
})
watch([allies, enemies], () => {
  if (!allies.value.some(s => s.id === pick.a.shipId)) pick.a.shipId = allies.value[0]?.id ?? null
  if (!enemies.value.some(s => s.id === pick.b.shipId)) pick.b.shipId = enemies.value[0]?.id ?? null
}, { immediate: true })
const shipOf = (side: Side) => ships.value.find(s => s.id === pick[side].shipId) ?? null
/** Disabled ships (detailed mode only) can't pick a move */
function isStuck(side: Side) {
  const s = shipOf(side)
  return !!s && detailed.value && shipCondition(s.data).disabled
}
const moveOf = (side: Side): Move | null => (isStuck(side) ? 'none' : pick[side].move)
const canResolve = computed(() => !!shipOf('a') && !!shipOf('b') && !!moveOf('a') && !!moveOf('b'))

interface Outcome {
  a: { id: number, name: string, move: Move }
  b: { id: number, name: string, move: Move }
  result: RoundOutcome
  applied: Record<Side, boolean>
  contestText: string
}
const outcome = ref<Outcome | null>(null)

async function resolve() {
  const A = shipOf('a')!
  const B = shipOf('b')!
  const result = resolveMoves({ move: moveOf('a')!, size: A.data.size }, { move: moveOf('b')!, size: B.data.size })
  outcome.value = {
    a: { id: A.id, name: A.name, move: moveOf('a')! },
    b: { id: B.id, name: B.name, move: moveOf('b')! },
    result,
    applied: { a: false, b: false },
    contestText: '',
  }
  const lines = [`${t('naval.round')} ${props.round || '–'}: ${A.name} ${t(`naval.moves.${moveOf('a')}`)} · ${B.name} ${t(`naval.moves.${moveOf('b')}`)} → ${result.summary}`]
  if (detailed.value) lines.push(...await tickShips())
  for (const l of lines) await addLog(l)
  pick.a.move = null
  pick.b.move = null
}

/** Detailed mode: fires burn (damage to the hull, deckhands count down), repair timers count down */
async function tickShips(): Promise<string[]> {
  const out: string[] = []
  for (const s of ships.value) {
    if (!s.data.fires.length && !s.data.repairs.some(r => r.roundsLeft != null)) continue
    let hull = s.data.hull
    const fires = []
    for (const f of s.data.fires) {
      const r = rollDice(FIRE_TABLE[f.size].dice)
      hull = Math.max(0, hull - r.total)
      out.push(`${s.name}: ${t(`naval.fireSizes.${f.size}`)} ${t('naval.fire').toLowerCase()} −${r.total}`)
      const left = f.roundsLeft == null ? null : f.roundsLeft - 1
      if (left === 0) out.push(`${s.name}: ${t('naval.fireOut')}`)
      else fires.push({ ...f, roundsLeft: left })
    }
    const repairs = []
    for (const r of s.data.repairs) {
      const left = r.roundsLeft == null ? null : r.roundsLeft - 1
      if (left !== null && left <= 0) out.push(`${s.name}: ${r.label} — ${t('naval.repairedNow')}`)
      else repairs.push({ ...r, roundsLeft: left })
    }
    await saveShip(s, { ...s.data, hull, fires, repairs })
  }
  return out
}

function rammer(side: Side) {
  return shipOf(side === 'a' ? 'b' : 'a')
}
/** Ram dice for the ship on `side`, plus the rammer's spiked hull / flaming ram (detailed mode) */
function ramDice(side: Side) {
  const r = outcome.value?.result[side].takesRam
  if (!r) return ''
  const extra = detailed.value ? (rammer(side)?.data.weapons.filter(w => w.mount === 'hull').map(w => w.damage) ?? []) : []
  return [r.dice, ...extra].join(' + ')
}
async function applyRam(side: Side) {
  const o = outcome.value
  const target = ships.value.find(s => s.id === o?.[side].id)
  if (!o || !target) return
  const roll = rollDice(ramDice(side))
  const hit = rammer(side)
  const fires = [...target.data.fires]
  if (detailed.value && hit?.data.weapons.some(w => w.mount === 'hull' && /flaming/i.test(w.name))) {
    fires.push({ id: Math.random().toString(36).slice(2, 10), size: 'moderate', roundsLeft: target.data.deckhands ? FIRE_TABLE.moderate.rounds : null })
  }
  await saveShip(target, { ...target.data, hull: Math.max(0, target.data.hull - roll.total), fires })
  o.applied[side] = true
  await addLog(`${target.name}: ${t('naval.ramDamage')} −${roll.total} (${roll.detail}), ${t('naval.braceDc', { dc: o.result[side].takesRam!.braceDc })}`)
  snackbarStore.success(`${target.name}: −${roll.total}`)
}

async function contest() {
  const o = outcome.value
  if (!o) return
  const roll = (side: Side) => {
    const s = shipOf(side)!
    const mode = detailed.value && shipCondition(s.data).halfMast ? 'disadvantage' : 'normal'
    return rollD20(mode) + maneuverBonus(s.data)
  }
  const ra = roll('a')
  const rb = roll('b')
  const winner = ra === rb ? null : ra > rb ? o.a.name : o.b.name
  o.contestText = `${o.a.name} ${ra} · ${o.b.name} ${rb} → ${winner ? t('naval.wins', { name: winner }) : t('naval.tie')}`
  if (winner) {
    o.result.a.weapons = ra > rb ? 'advantage' : 'disadvantage'
    o.result.b.weapons = ra > rb ? 'disadvantage' : 'advantage'
  }
  await addLog(o.contestText)
}

function sideChips(s: SideOutcome) {
  const out: { text: string, color: string }[] = []
  if (s.weapons === 'advantage') out.push({ text: t('naval.advantage'), color: 'success' })
  if (s.weapons === 'disadvantage') out.push({ text: t('naval.disadvantage'), color: 'error' })
  if (s.perfectFlank) out.push({ text: t('naval.perfectFlank'), color: 'success' })
  if (s.broadsidesMiss) out.push({ text: t('naval.broadsidesMiss'), color: 'error' })
  if (s.onlyMounts) out.push({ text: t('naval.onlyMounts', { mounts: s.onlyMounts.map(m => t(`naval.mounts.${m}`)).join(', ') }), color: 'warning' })
  if (s.takesRam) out.push({ text: t('naval.rammed'), color: 'error' })
  if (s.mayFlee) out.push({ text: t('naval.fleeOrFire'), color: 'info' })
  if (!out.length) out.push({ text: t('naval.noChange'), color: 'grey' })
  return out
}
</script>

<style scoped>
.move-grid, .outcome-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.ship-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
</style>
