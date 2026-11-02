<template>
  <v-card class="dash-card h-100 d-flex flex-column" :class="{ 'dash-card--arrange': arranging }" variant="flat" border>
    <div v-if="!bare || arranging" class="dash-card__head d-flex align-center px-3 py-2" :class="{ 'drag-handle': arranging }">
      <v-icon v-if="arranging" size="small" class="mr-1 text-medium-emphasis">mdi-drag</v-icon>
      <v-icon size="small" color="primary" class="mr-2">{{ icon }}</v-icon>
      <span class="text-title-small font-weight-bold text-truncate">{{ title }}</span>
      <v-spacer />
      <slot name="actions" />
      <v-btn v-if="arranging" icon="mdi-close" size="x-small" variant="text" :title="$t('dashboardBoards.remove')" @click.stop="$emit('remove')" />
    </div>
    <v-divider v-if="!bare || arranging" />
    <div class="dash-card__body flex-grow-1" :class="{ 'pa-3': !flush && !bare }">
      <slot />
    </div>
  </v-card>
</template>

<script setup lang="ts">
/** The shell every dashboard card sits in: title bar (drag handle while arranging), scrolling body. */
defineProps<{ title: string, icon: string, arranging?: boolean, flush?: boolean, /** the card brings its own title (older widgets) */ bare?: boolean }>()
defineEmits<{ remove: [] }>()
</script>

<style scoped>
.dash-card {
  overflow: hidden;
}
.dash-card--arrange {
  outline: 2px dashed rgba(var(--v-theme-primary), 0.5);
  outline-offset: -2px;
}
.drag-handle {
  cursor: move;
  user-select: none;
}
.dash-card__body {
  min-height: 0;
  overflow: auto;
  position: relative;
}
</style>
