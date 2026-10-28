/**
 * Display units — Imperial (lb, °F, miles) or Metric (kg, °C, km).
 *
 * Storage never changes: item weights are stored in pounds (D&D's unit for
 * carrying capacity) and temperatures in °C (what the weather generator and
 * climate presets use). Only what the user sees and types is converted.
 *
 * Saved per device in localStorage (`dm-hero-unit-system`), default Imperial.
 * Hydration happens in onMounted so SSR and the first client render agree.
 */

import { computed, onMounted, readonly, ref } from 'vue'

export type UnitSystem = 'imperial' | 'metric'

const STORAGE_KEY = 'dm-hero-unit-system'
const LB_PER_KG = 2.20462

const unitSystem = ref<UnitSystem>('imperial')
let hydrated = false

function readStored() {
  if (typeof localStorage === 'undefined') return
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'metric' || v === 'imperial') unitSystem.value = v
  }
  catch {
    // private mode / blocked storage — keep the default
  }
}

function hydrate() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  readStored()
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) readStored()
  })
}

function round(n: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

/** °C → °F (or unchanged for metric), rounded to whole degrees. */
export function celsiusToDisplay(celsius: number, system: UnitSystem): number {
  return system === 'imperial' ? Math.round(celsius * 9 / 5 + 32) : Math.round(celsius)
}

/** What the user typed (°F or °C) → °C for storage, one decimal. */
export function displayToCelsius(value: number, system: UnitSystem): number {
  return system === 'imperial' ? round((value - 32) * 5 / 9, 1) : value
}

/** Pounds → display unit (lb or kg). */
export function poundsToDisplay(lb: number, system: UnitSystem): number {
  return system === 'imperial' ? round(lb, 2) : round(lb / LB_PER_KG, 2)
}

/** Display unit (lb or kg) → pounds for storage. */
export function displayToPounds(value: number, system: UnitSystem): number {
  return system === 'imperial' ? value : round(value * LB_PER_KG, 3)
}

export function useUnits() {
  onMounted(hydrate)

  const isImperial = computed(() => unitSystem.value === 'imperial')
  const tempUnit = computed(() => (isImperial.value ? '°F' : '°C'))
  const weightUnit = computed(() => (isImperial.value ? 'lb' : 'kg'))
  const distanceUnit = computed(() => (isImperial.value ? 'miles' : 'km'))

  function setUnitSystem(value: UnitSystem) {
    unitSystem.value = value
    try {
      localStorage.setItem(STORAGE_KEY, value)
    }
    catch {
      // ignore
    }
  }

  function tempToDisplay(celsius: number | null | undefined): number | null {
    return celsius === null || celsius === undefined ? null : celsiusToDisplay(celsius, unitSystem.value)
  }

  function tempFromDisplay(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null
    const n = Number(value)
    return Number.isFinite(n) ? displayToCelsius(n, unitSystem.value) : null
  }

  function formatTemp(celsius: number | null | undefined): string {
    const v = tempToDisplay(celsius)
    return v === null ? '' : `${v}${tempUnit.value}`
  }

  function weightToDisplay(lb: number | null | undefined): number | null {
    return lb === null || lb === undefined ? null : poundsToDisplay(lb, unitSystem.value)
  }

  function weightFromDisplay(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null
    const n = Number(value)
    return Number.isFinite(n) && n >= 0 ? displayToPounds(n, unitSystem.value) : null
  }

  function formatWeight(lb: number | null | undefined): string {
    const v = weightToDisplay(lb)
    if (v === null) return ''
    return `${Number(v.toFixed(2))} ${weightUnit.value}`
  }

  return {
    unitSystem: readonly(unitSystem),
    isImperial,
    tempUnit,
    weightUnit,
    distanceUnit,
    setUnitSystem,
    tempToDisplay,
    tempFromDisplay,
    formatTemp,
    weightToDisplay,
    weightFromDisplay,
    formatWeight,
  }
}
