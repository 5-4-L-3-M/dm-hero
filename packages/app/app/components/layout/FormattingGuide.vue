<template>
  <v-menu :close-on-content-click="false" location="bottom end" max-width="560">
    <template #activator="{ props: menuProps }">
      <v-btn v-bind="menuProps" icon="mdi-format-text" variant="text" class="mr-1" :aria-label="$t('formattingGuide.title')">
        <v-icon>mdi-format-text</v-icon>
        <v-tooltip activator="parent" location="bottom">{{ $t('formattingGuide.title') }}</v-tooltip>
      </v-btn>
    </template>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-format-text</v-icon>{{ $t('formattingGuide.title') }}
      </v-card-title>
      <v-card-subtitle class="text-wrap">{{ $t('formattingGuide.intro') }}</v-card-subtitle>
      <v-card-text>
        <table class="guide">
          <thead>
            <tr>
              <th>{{ $t('formattingGuide.youType') }}</th>
              <th>{{ $t('formattingGuide.becomes') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key">
              <td><code>{{ row.example }}</code></td>
              <td>
                <SharedFormattedText :text="row.example" class="guide__preview" />
                <div class="text-body-small text-medium-emphasis">{{ $t(`formattingGuide.rules.${row.key}`) }}</div>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="text-body-small text-medium-emphasis mt-3 mb-0">{{ $t('formattingGuide.note') }}</p>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
/** Top-bar cheat sheet: how plain text turns into headings, labels and bullets. */
const rows = [
  { key: 'mdHeading', example: '## What Brom knows' },
  { key: 'colonHeading', example: 'Personality:' },
  { key: 'capsHeading', example: 'DAMASK ROW (TENT 4)' },
  { key: 'label', example: 'Leader: Evander' },
  { key: 'bullet', example: '- The sigil belongs to the crown' },
  { key: 'bold', example: 'A **secret** door' },
]
</script>

<style scoped>
.guide {
  width: 100%;
  border-collapse: collapse;
}
.guide th {
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
  padding: 4px 8px 8px 0;
}
.guide td {
  vertical-align: top;
  padding: 8px 8px 8px 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
.guide td:first-child {
  width: 46%;
}
.guide code {
  font-size: 0.85rem;
  background: rgba(var(--v-theme-on-surface), 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: pre-wrap;
}
.guide__preview :deep(.formatted-text__heading),
.guide__preview :deep(.formatted-text__para),
.guide__preview :deep(.formatted-text__list) {
  margin: 0;
}
</style>
