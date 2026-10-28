<template>
  <v-menu
    v-model="menuOpen"
    :close-on-content-click="false"
    :open-on-click="false"
    :open-on-focus="false"
    location="bottom start"
    max-height="340"
  >
    <template #activator="{ props: menuProps }">
      <v-text-field
        v-bind="{ ...menuProps, ...$attrs }"
        ref="fieldRef"
        :model-value="text"
        @update:model-value="onInput"
        @keydown="onKeydown"
      />
    </template>

    <v-list density="compact" min-width="260">
      <v-list-subheader>{{ $t('tags.suggest.title') }}</v-list-subheader>
      <v-list-item
        v-for="(tag, i) in suggestions"
        :key="tag.id"
        :active="i === activeIndex"
        @click="apply(tag.name)"
      >
        <template #prepend>
          <span class="tag-search__swatch" :style="{ background: tag.color || '#999' }" />
        </template>
        <v-list-item-title>#{{ tag.name }}</v-list-item-title>
        <template #append>
          <span class="text-body-small text-medium-emphasis">{{ tag.usage_count }}</span>
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
/**
 * Drop-in replacement for a search v-text-field that suggests existing tags
 * while you type `#…`. Arrow keys move, Enter/Tab picks, Esc hides.
 * All other attributes (placeholder, clearable, variant, …) pass through.
 */
import { useTagsStore } from '~/stores/tags'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ modelValue?: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

const tagsStore = useTagsStore()
const fieldRef = ref<{ focus: () => void } | null>(null)

// Local copy so picking a suggestion shows up even when the parent binds a
// non-reactive value (the Locations page does that for smooth typing).
const text = ref(props.modelValue ?? '')
watch(() => props.modelValue, (v) => {
  if ((v ?? '') !== text.value) text.value = v ?? ''
})

const activeIndex = ref(0)
const dismissed = ref(false)
let catalogueRefreshed = false

/** The `#partial` the cursor is on (always the last token). */
const currentToken = computed(() => {
  const m = /(?:^|\s)(#[^\s#]*)$/.exec(text.value)
  return m ? m[1]! : null
})

const suggestions = computed(() => {
  const token = currentToken.value
  if (token === null) return []
  const term = token.slice(1).toLowerCase()
  const alreadyUsed = new Set(
    text.value.split(/\s+/).filter(w => w.startsWith('#') && w !== token).map(w => w.slice(1)),
  )
  return tagsStore.catalogue
    .filter(t => !alreadyUsed.has(t.name) && t.name.includes(term))
    .sort((a, b) =>
      Number(b.name.startsWith(term)) - Number(a.name.startsWith(term))
      || (b.usage_count ?? 0) - (a.usage_count ?? 0)
      || a.name.localeCompare(b.name))
    .slice(0, 8)
})

const menuOpen = computed({
  get: () => !dismissed.value && suggestions.value.length > 0,
  set: (open: boolean) => {
    if (!open) dismissed.value = true
  },
})

watch(currentToken, (token, previous) => {
  if (token !== previous) {
    activeIndex.value = 0
    dismissed.value = false
  }
  // First `#` typed on this field: refresh the catalogue once so new tags show up
  if (token !== null && !catalogueRefreshed) {
    catalogueRefreshed = true
    tagsStore.loadCatalogue(true)
  }
})

onMounted(() => {
  tagsStore.loadCatalogue()
})

function onInput(value: string | null) {
  text.value = value ?? ''
  emit('update:modelValue', value)
}

function apply(name: string) {
  const token = currentToken.value
  if (token === null) return
  text.value = `${text.value.slice(0, text.value.length - token.length)}#${name} `
  emit('update:modelValue', text.value)
  nextTick(() => fieldRef.value?.focus())
}

function onKeydown(event: KeyboardEvent) {
  if (!menuOpen.value) return
  const count = suggestions.value.length
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % count
  }
  else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + count) % count
  }
  else if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault()
    apply(suggestions.value[activeIndex.value]!.name)
  }
  else if (event.key === 'Escape') {
    // Hide the suggestions only — don't close a surrounding dialog
    event.preventDefault()
    event.stopPropagation()
    dismissed.value = true
  }
}
</script>

<style scoped>
.tag-search__swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 10px;
}
</style>
