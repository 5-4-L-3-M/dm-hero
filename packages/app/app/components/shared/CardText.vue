<template>
  <template v-if="plain">{{ plain }}</template>
</template>

<script setup lang="ts">
import { cardText } from '~/utils/formattedText'

/** A description as plain text for cards: no markdown symbols, entry links by name. */
const props = defineProps<{ text?: string | null }>()
const { nameOf } = useEntityNames()
const plain = computed(() => cardText(props.text, nameOf))
</script>
