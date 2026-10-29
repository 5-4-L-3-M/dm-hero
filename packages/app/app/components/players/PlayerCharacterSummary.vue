<template>
  <div v-if="has" class="pc-summary" :class="{ 'pc-summary--compact': compact }">
    <!-- Who they are: race · classes, then subclass · alignment · background -->
    <div v-if="identity" class="pc-summary__identity">
      {{ identity }}
      <v-chip v-if="level" size="x-small" variant="tonal" color="primary" class="ml-1 pc-summary__level">
        {{ $t('players.character.levelShort', { level }) }}
      </v-chip>
    </div>
    <div v-if="subline" class="pc-summary__subline text-medium-emphasis">{{ subline }}</div>

    <!-- Combat numbers at a glance -->
    <div v-if="stats.length" class="pc-summary__stats">
      <div v-for="s in stats" :key="s.key" class="pc-summary__stat">
        <div class="pc-summary__stat-label">{{ s.label }}</div>
        <div class="pc-summary__stat-value">{{ s.value }}</div>
      </div>
    </div>

    <!-- Patron, homeland, phobia -->
    <div v-if="tags.length" class="pc-summary__tags">
      <span v-for="tag in tags" :key="tag.key" class="pc-summary__tag" :title="tag.label">
        <v-icon :icon="tag.icon" size="14" class="mr-1" />{{ tag.value }}
      </span>
    </div>

    <!-- Age / height / weight (full view only) -->
    <div v-if="!compact && physical.length" class="pc-summary__physical text-medium-emphasis">
      <span v-for="p in physical" :key="p.key"><strong>{{ p.label }}</strong> {{ p.value }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { classLine, hasCharacterInfo, readCharacterInfo, totalLevel } from '~~/types/player'
import { ageText } from '~~/types/age'

/**
 * A player character's details laid out like the top of a character sheet:
 * identity line, a row of stat boxes, then patron/homeland/phobia.
 */
const props = defineProps<{
  metadata: Record<string, unknown> | null | undefined
  /** Card size: hides age/height/weight */
  compact?: boolean
}>()

const { t } = useI18n()
const info = computed(() => readCharacterInfo(props.metadata))
const has = computed(() => hasCharacterInfo(info.value))
const level = computed(() => totalLevel(info.value))

const identity = computed(() => [info.value.race, classLine(info.value)].filter(Boolean).join(' · '))
const subline = computed(() => {
  const subclasses = info.value.classes.map(c => c.subclass).filter(Boolean).join(' / ')
  return [subclasses, info.value.alignment, info.value.background].filter(Boolean).join(' · ')
})

const stats = computed(() => {
  const i = info.value
  return [
    { key: 'ac', label: t('players.character.acShort'), value: i.ac },
    { key: 'hp', label: t('players.character.hpShort'), value: i.hp },
    { key: 'speed', label: t('players.character.speedShort'), value: i.speed },
    { key: 'init', label: t('players.character.initiativeShort'), value: i.initiative },
    { key: 'prof', label: t('players.character.proficiencyShort'), value: i.proficiency },
    { key: 'pp', label: t('players.character.passivePerceptionShort'), value: i.passive_perception },
  ].filter(s => s.value !== null && s.value !== '')
})

const tags = computed(() => {
  const i = info.value
  return [
    { key: 'patron', icon: 'mdi-star-four-points-outline', label: t('players.character.patron'), value: i.patron },
    { key: 'homeland', icon: 'mdi-home-map-marker', label: t('players.character.homeland'), value: i.homeland },
    { key: 'phobia', icon: 'mdi-alert-octagon-outline', label: t('players.character.phobia'), value: i.phobia },
  ].filter(x => x.value)
})

const physical = computed(() => {
  const i = info.value
  return [
    { key: 'age', label: t('players.character.age'), value: ageText(i.age, i.age_human, t('npcs.humanWord')) },
    { key: 'height', label: t('players.character.height'), value: i.height },
    { key: 'weight', label: t('players.character.weight'), value: i.weight },
  ].filter(x => x.value)
})
</script>

<style scoped>
.pc-summary__identity {
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.35;
}
.pc-summary__level {
  vertical-align: 1px;
}
.pc-summary__subline {
  font-size: 0.85rem;
  margin-top: 2px;
}
.pc-summary__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.pc-summary__stat {
  min-width: 46px;
  padding: 3px 8px;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.06);
  text-align: center;
}
.pc-summary__stat-label {
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}
.pc-summary__stat-value {
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.2;
}
.pc-summary__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 10px;
  font-size: 0.85rem;
}
.pc-summary__tag {
  display: inline-flex;
  align-items: center;
}
.pc-summary__physical {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 8px;
  font-size: 0.85rem;
}
.pc-summary__physical strong {
  font-weight: 600;
  margin-right: 3px;
}
.pc-summary--compact .pc-summary__identity {
  font-size: 0.95rem;
}
.pc-summary--compact .pc-summary__stats {
  margin-top: 8px;
}
.pc-summary--compact .pc-summary__stat {
  min-width: 40px;
  padding: 2px 6px;
}
.pc-summary--compact .pc-summary__tags {
  margin-top: 8px;
}
</style>
