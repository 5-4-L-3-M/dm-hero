<template>
  <div v-if="groups.length" class="d-flex flex-column ga-2">
    <div v-for="g in groups" :key="g.id">
      <EntityLink :id="g.id" :type="g.kind" :name="g.name" class="font-weight-bold" />
      <div class="d-flex flex-wrap ga-1 mt-1">
        <v-chip v-for="r in g.roles" :key="r.id" size="x-small" variant="outlined" prepend-icon="mdi-account-plus-outline">{{ r.role }}</v-chip>
      </div>
    </div>
  </div>
  <div v-else class="text-body-medium text-medium-emphasis">{{ $t('dashboardBoards.cards.openRoles.empty') }}</div>
</template>

<script setup lang="ts">
import EntityLink from '~/components/shared/EntityLink.vue'
import type { Roster } from '~~/types/roster'

/** Roster roles nobody fills yet, by place — prep homework. */
const props = defineProps<{ campaignId: number }>()
const roster = ref<Roster | null>(null)

async function load() {
  roster.value = await $fetch<Roster>('/api/roster', { query: { campaignId: props.campaignId } }).catch(() => null)
}
onMounted(load)
watch(() => props.campaignId, load)

const groups = computed(() => {
  const r = roster.value
  if (!r) return []
  return r.places.flatMap((p) => {
    const roles = r.roles.filter(x => x.location_id === p.location_id && !x.npc)
    return roles.length ? [{ id: p.location_id, name: p.name, kind: p.kind, roles }] : []
  })
})
</script>
