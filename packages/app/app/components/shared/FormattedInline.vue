<template>
  <template v-for="(p, i) in parts" :key="i">
    <SharedEntityLink
      v-if="p.link"
      :type="p.link.type"
      :id="p.link.id"
      :name="nameOf(p.link.type, p.link.id)"
      :class="{ 'font-weight-bold': p.bold }"
    />
    <strong v-else-if="p.bold">{{ p.text }}</strong>
    <template v-else>{{ p.text }}</template>
  </template>
</template>

<script setup lang="ts">
import type { InlinePart } from '~/utils/formattedText'

/** One line of FormattedText: plain, bold, and entry links shown by name. */
defineProps<{ parts: InlinePart[] }>()
const { nameOf } = useEntityNames()
</script>
