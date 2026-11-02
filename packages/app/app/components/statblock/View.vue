<template>
  <div class="statblock" :class="{ 'statblock--compact': compact }">
    <div v-if="name || subtitle" class="mb-2">
      <div v-if="name" class="sb-name">{{ name }}</div>
      <div v-if="subtitle" class="sb-sub">{{ subtitle }}</div>
    </div>

    <!-- Defense -->
    <div class="sb-defense">
      <div v-if="block.ac != null" class="sb-pill"><v-icon size="16">mdi-shield</v-icon><b>{{ block.ac }}</b><span>AC</span><small v-if="block.ac_note">({{ block.ac_note }})</small></div>
      <div v-if="block.hp != null" class="sb-pill"><v-icon size="16">mdi-heart</v-icon><b>{{ block.hp }}</b><span>HP</span>
        <small v-if="block.hp_formula" class="sb-roll" role="button" @click="roll('HP', block.hp_formula)">({{ block.hp_formula }})</small>
      </div>
      <div v-if="block.speed" class="sb-pill"><v-icon size="16">mdi-run-fast</v-icon><span>{{ block.speed }}</span></div>
      <div v-if="block.cr" class="sb-pill"><v-icon size="16">mdi-skull-outline</v-icon><span>CR {{ block.cr }}<template v-if="block.xp"> · {{ block.xp }} XP</template></span></div>
    </div>

    <!-- Abilities: click one to roll a check -->
    <div v-if="hasAbilities" class="sb-abilities">
      <div v-for="a in ABILITIES" :key="a" class="sb-ability" role="button" :title="$t('statblock.rollCheck')" @click="roll(a.toUpperCase(), `1d20${fmtMod(abilityMod(block[a]))}`)">
        <div class="sb-ab-name">{{ a.toUpperCase() }}</div>
        <div class="sb-ab-score">{{ block[a] ?? 10 }}</div>
        <div class="sb-ab-mod">{{ fmtMod(abilityMod(block[a])) }}</div>
      </div>
    </div>

    <!-- Details -->
    <div class="sb-details">
      <div v-for="d in details" :key="d.key"><b>{{ $t(`statblock.fields.${d.key}`) }}</b> {{ d.value }}</div>
    </div>

    <!-- Last rolls -->
    <div v-if="rolls.length" class="sb-rolls">
      <div v-for="(r, i) in rolls" :key="r.id" class="sb-rollres" :class="{ 'sb-rollres--old': i > 0 }">
        <span class="sb-rollres-label">{{ r.label }}</span>
        <b class="sb-rollres-total" :class="{ crit: r.crit, fumble: r.fumble }">{{ r.total }}</b>
        <span class="sb-rollres-detail">{{ r.detail }}</span>
      </div>
    </div>

    <!-- Traits / actions … -->
    <template v-for="s in sections" :key="s.key">
      <div class="sb-section">{{ $t(`statblock.sections.${s.key}`) }}</div>
      <div v-for="(f, i) in s.items" :key="i" class="sb-feature">
        <span class="sb-fname">{{ f.name }}.</span>
        <span class="sb-ftext">{{ f.text }}</span>
        <div v-if="rollable && rollPartsOf(f.text).length" class="sb-chips">
          <v-chip
            v-for="(p, j) in rollPartsOf(f.text)"
            :key="j"
            size="small"
            :variant="p.dice ? 'flat' : 'outlined'"
            :color="p.kind === 'hit' ? 'primary' : p.kind === 'damage' ? 'error' : undefined"
            :prepend-icon="p.kind === 'hit' ? 'mdi-target' : p.kind === 'damage' ? 'mdi-sword' : 'mdi-shield-alert-outline'"
            :disabled="!p.dice"
            @click="p.dice && roll(`${f.name} · ${p.kind === 'hit' ? $t('statblock.toHit') : p.label}`, p.dice, p.kind === 'hit')"
          >
            {{ p.label }}
          </v-chip>
        </div>
      </div>
    </template>

    <div v-if="block.notes" class="sb-section">{{ $t('statblock.sections.notes') }}</div>
    <div v-if="block.notes" class="sb-notes">{{ block.notes }}</div>
  </div>
</template>

<script setup lang="ts">
import { ABILITIES, FEATURE_SECTIONS, abilityMod, fmtMod, rollParts, type StatBlock, type StatFeature } from '~~/types/statblock'
import { rollDice } from '~~/types/rollTable'

/** A 5e stat block that reads at a glance; attacks, checks and HP roll on click. */
const props = withDefaults(defineProps<{ block: StatBlock, name?: string | null, rollable?: boolean, compact?: boolean }>(), { name: null, rollable: true, compact: false })

const subtitle = computed(() => [props.block.size, props.block.kind].filter(Boolean).join(' ') + (props.block.alignment ? `, ${props.block.alignment}` : ''))
const hasAbilities = computed(() => ABILITIES.some(a => props.block[a] != null))
const DETAIL_KEYS = ['saves', 'skills', 'vulnerabilities', 'resistances', 'immunities', 'condition_immunities', 'senses', 'languages'] as const
const details = computed(() => DETAIL_KEYS.flatMap(k => (props.block[k] ? [{ key: k, value: props.block[k] as string }] : [])))
const sections = computed(() => FEATURE_SECTIONS.flatMap(k => ((props.block[k] as StatFeature[] | undefined)?.length ? [{ key: k, items: props.block[k] as StatFeature[] }] : [])))

const cache = new Map<string, ReturnType<typeof rollParts>>()
function rollPartsOf(text: string) {
  if (!cache.has(text)) cache.set(text, rollParts(text))
  return cache.get(text)!
}

const rolls = ref<Array<{ id: number, label: string, total: number, detail: string, crit: boolean, fumble: boolean }>>([])
let seq = 0
function roll(label: string, dice: string, d20 = false) {
  const r = rollDice(dice)
  const first = r.rolls[0] ?? 0
  const bonus = r.total - r.rolls.reduce((a, b) => a + b, 0)
  rolls.value = [{
    id: ++seq,
    label,
    total: r.total,
    detail: `${dice} → ${r.rolls.join(' + ')}${bonus ? ` ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)}` : ''}`,
    crit: (d20 || dice.startsWith('1d20')) && first === 20,
    fumble: (d20 || dice.startsWith('1d20')) && first === 1,
  }, ...rolls.value].slice(0, 3)
}
</script>

<style scoped>
.statblock {
  --sb-accent: rgb(var(--v-theme-primary));
  line-height: 1.45;
}
.sb-name {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--sb-accent);
}
.sb-sub {
  font-style: italic;
  opacity: 0.75;
  font-size: 0.9rem;
}
.sb-defense {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.sb-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.07);
  font-size: 0.9rem;
}
.sb-pill b {
  font-size: 1.05rem;
}
.sb-pill small {
  opacity: 0.7;
}
.sb-roll {
  cursor: pointer;
  text-decoration: underline dotted;
}
.sb-abilities {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 10px;
}
.sb-ability {
  text-align: center;
  padding: 4px 2px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  cursor: pointer;
}
.sb-ability:hover {
  border-color: var(--sb-accent);
}
.sb-ab-name {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  opacity: 0.7;
}
.sb-ab-score {
  font-size: 1.05rem;
  font-weight: 700;
}
.sb-ab-mod {
  font-size: 0.8rem;
  opacity: 0.8;
}
.sb-details {
  font-size: 0.9rem;
  margin-bottom: 4px;
}
.sb-details b {
  color: var(--sb-accent);
  font-weight: 600;
}
.sb-section {
  margin: 12px 0 6px;
  padding-bottom: 2px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sb-accent);
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.4);
}
.sb-feature {
  margin-bottom: 8px;
  font-size: 0.95rem;
}
.sb-fname {
  font-weight: 700;
  font-style: italic;
  margin-right: 4px;
}
.sb-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
.sb-notes {
  white-space: pre-line;
  font-size: 0.92rem;
}
.sb-rolls {
  margin: 8px 0;
}
.sb-rollres {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.14);
  border-left: 3px solid var(--sb-accent);
  margin-bottom: 4px;
}
.sb-rollres--old {
  opacity: 0.55;
  background: transparent;
  padding: 2px 10px;
}
.sb-rollres-label {
  font-size: 0.85rem;
}
.sb-rollres-total {
  font-size: 1.35rem;
}
.sb-rollres--old .sb-rollres-total {
  font-size: 1rem;
}
.sb-rollres-total.crit {
  color: rgb(var(--v-theme-success));
}
.sb-rollres-total.fumble {
  color: rgb(var(--v-theme-error));
}
.sb-rollres-detail {
  font-size: 0.75rem;
  opacity: 0.7;
}
.statblock--compact .sb-abilities {
  gap: 4px;
}
.statblock--compact .sb-name {
  font-size: 1.15rem;
}
</style>
