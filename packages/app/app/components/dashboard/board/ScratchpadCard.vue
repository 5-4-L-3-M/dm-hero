<template>
  <textarea
    :value="local"
    class="pad text-body-medium"
    :placeholder="$t('dashboardBoards.cards.scratchpad.placeholder')"
    @input="onInput(($event.target as HTMLTextAreaElement).value)"
  />
</template>

<script setup lang="ts">
/** Free notes that stay with this dashboard (saved a moment after you stop typing). */
const props = defineProps<{ text: string }>()
const emit = defineEmits<{ change: [text: string] }>()
let timer: ReturnType<typeof setTimeout> | null = null
const local = ref(props.text)
watch(() => props.text, (v) => {
  if (!timer) local.value = v
})
function onInput(v: string) {
  local.value = v
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    emit('change', local.value)
  }, 600)
}
</script>

<style scoped>
.pad {
  width: 100%;
  height: 100%;
  min-height: 80px;
  resize: none;
  outline: none;
  border: none;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  font-family: inherit;
}
</style>
