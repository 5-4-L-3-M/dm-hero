<template>
  <div>
    <div class="d-flex ga-2 align-start">
      <v-select
        :model-value="role ?? null"
        :items="items"
        :label="$t('naval.shipRole')"
        :hint="$t('naval.shipRoleHint')"
        persistent-hint
        variant="outlined"
        clearable
        class="flex-grow-1"
        @update:model-value="v => emit('update:role', v ?? undefined)"
      >
        <template #item="{ props: itemProps, internalItem }">
          <v-list-item v-bind="itemProps" :prepend-icon="SHIP_ROLE_ICONS[internalItem.value as ShipRole]" />
        </template>
      </v-select>
      <v-btn-toggle
        v-if="current"
        :model-value="readShipRank(rank)"
        density="comfortable"
        variant="outlined"
        mandatory
        divided
        class="mt-1"
        @update:model-value="v => emit('update:rank', v)"
      >
        <v-btn v-for="(l, i) in RANK_LABELS" :key="l" :value="i + 1" size="small">{{ l }}</v-btn>
      </v-btn-toggle>
    </div>
    <v-expansion-panels v-if="current" variant="accordion" class="mt-2">
      <v-expansion-panel>
        <v-expansion-panel-title class="text-body-medium">
          <v-icon size="small" class="mr-2">{{ SHIP_ROLE_ICONS[current] }}</v-icon>
          {{ $t('naval.roleFeatures') }}
        </v-expansion-panel-title>
        <v-expansion-panel-text class="text-body-medium">
          <p class="mb-2 text-medium-emphasis">{{ SHIP_ROLE_FEATURES[current].duty }}</p>
          <p v-for="(f, i) in SHIP_ROLE_FEATURES[current].ranks.slice(0, readShipRank(rank))" :key="i" class="mb-1">
            <strong>{{ $t('naval.rankN', { n: RANK_LABELS[i] }) }}:</strong> {{ f }}
          </p>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
import { RANK_LABELS, SHIP_ROLES, SHIP_ROLE_FEATURES, SHIP_ROLE_ICONS, readShipRank, readShipRole, type ShipRole } from '~~/types/ship'

const props = defineProps<{ role?: string | null, rank?: number | string | null }>()
const emit = defineEmits<{
  (e: 'update:role', v: string | undefined): void
  (e: 'update:rank', v: number): void
}>()
const { t } = useI18n()
const current = computed(() => readShipRole(props.role))
const items = computed(() => SHIP_ROLES.map(r => ({ title: t(`naval.roles.${r}`), value: r })))
</script>
