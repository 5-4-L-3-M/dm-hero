<template>
  <a
    v-if="previewType && id"
    class="entity-link"
    role="button"
    tabindex="0"
    :title="$t('entityLink.open')"
    @click.stop.prevent="openEntity"
    @keydown.enter.stop.prevent="openEntity"
  >
    <slot>{{ name }}</slot>
  </a>
  <span v-else><slot>{{ name }}</slot></span>
</template>

<script setup lang="ts">
import { toPreviewType } from '~/stores/entityTabs'
import type { EntityPreviewType } from './EntityPreviewDialog.vue'

/**
 * A clickable entry name. Inside a dialog it opens the quick preview on top
 * (the dialog stays put); anywhere else it opens the entry as a tab in the
 * side panel, so you never leave the page you're on.
 */
const props = defineProps<{
  /** Preview type ("npc") or the database type name ("NPC", "Location" …) */
  type: EntityPreviewType | string | null | undefined
  id: number | null | undefined
  name?: string | null
}>()

const tabs = useEntityTabsStore()
const peek = useEntityPeekStore()

const previewType = computed(() => toPreviewType(props.type))

function openEntity(event: Event) {
  if (!previewType.value || !props.id) return
  const insideDialog = !!(event.currentTarget as HTMLElement | null)?.closest('.v-overlay__content')
  if (insideDialog) peek.show(previewType.value, props.id)
  else tabs.open(previewType.value, props.id, props.name ?? '')
}
</script>

<style scoped>
.entity-link {
  color: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-decoration-color: rgba(var(--v-theme-primary), 0.7);
  text-underline-offset: 3px;
}
.entity-link:hover,
.entity-link:focus-visible {
  color: rgb(var(--v-theme-primary));
  text-decoration-style: solid;
  outline: none;
}
</style>
