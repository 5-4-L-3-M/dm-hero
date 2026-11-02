<template>
  <div class="formatted-text">
    <template v-for="(block, i) in blocks" :key="i">
      <div v-if="block.kind === 'heading'" class="formatted-text__heading">
        <SharedFormattedInline :parts="block.parts" />
      </div>
      <p v-else-if="block.kind === 'paragraph'" class="formatted-text__para">
        <template v-for="(line, j) in block.lines" :key="j">
          <br v-if="j > 0" />
          <SharedFormattedInline :parts="line" />
        </template>
      </p>
      <ul v-else-if="block.kind === 'bullets'" class="formatted-text__list">
        <li v-for="(item, j) in block.items" :key="j">
          <SharedFormattedInline :parts="item" />
        </li>
      </ul>
      <p v-else class="formatted-text__para formatted-text__labeled">
        <span class="formatted-text__label">{{ block.label }}</span>
        <SharedFormattedInline :parts="block.parts" />
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { parseFormattedText } from '~/utils/formattedText'

/** Plain text shown with headings, bold labels and bullets (see parseFormattedText). */
const props = defineProps<{ text: string | null | undefined }>()
const blocks = computed(() => parseFormattedText(props.text))
</script>

<style scoped>
.formatted-text__heading {
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin: 1.1em 0 0.35em;
  padding-bottom: 0.2em;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.25);
}
.formatted-text__heading:first-child {
  margin-top: 0;
}
.formatted-text__para {
  margin: 0 0 0.75em;
}
.formatted-text__list {
  margin: 0 0 0.75em;
  padding-left: 1.3em;
}
.formatted-text__list li {
  margin-bottom: 0.25em;
}
.formatted-text__list li::marker {
  color: rgb(var(--v-theme-primary));
}
.formatted-text__label {
  font-weight: 600;
  margin-right: 0.35em;
}
.formatted-text__label::after {
  content: ':';
}
</style>
