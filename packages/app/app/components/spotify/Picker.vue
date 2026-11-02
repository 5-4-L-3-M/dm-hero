<template>
  <v-dialog :model-value="modelValue" max-width="640" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon color="success" class="mr-2">mdi-spotify</v-icon>{{ $t('spotify.picker.title') }}
      </v-card-title>
      <v-card-text style="max-height: 70vh">
        <v-text-field
          v-model="query"
          :placeholder="$t('spotify.picker.search')"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          hide-details
          class="mb-3"
          @update:model-value="onQuery"
        />
        <div class="text-body-small text-medium-emphasis mb-1">{{ query ? $t('spotify.picker.results') : $t('spotify.picker.yours') }}</div>
        <v-progress-linear v-if="loading" indeterminate color="success" class="mb-2" />
        <v-list density="compact" class="pa-0">
          <v-list-item v-for="item in shown" :key="item.uri" :title="item.name" :subtitle="[$t(`spotify.kinds.${item.kind}`), item.subtitle].filter(Boolean).join(' · ')">
            <template #prepend>
              <v-avatar rounded="sm" color="surface-variant">
                <v-img v-if="item.image" :src="item.image" cover />
                <v-icon v-else>mdi-music</v-icon>
              </v-avatar>
            </template>
            <template #append>
              <v-btn icon="mdi-play" size="small" variant="text" color="success" :title="$t('spotify.play')" @click="spotify.play(item.uri)" />
              <v-btn v-if="item.kind !== 'track'" size="small" variant="tonal" color="primary" prepend-icon="mdi-star-plus" class="ml-1" @click="add(item)">{{ $t('spotify.picker.addScene') }}</v-btn>
            </template>
          </v-list-item>
        </v-list>
        <div v-if="!loading && !shown.length" class="text-body-medium text-medium-emphasis py-4 text-center">{{ $t('spotify.picker.empty') }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { SpotifyItem } from '~~/types/spotify'

/** Pick from your playlists or search Spotify; play it or keep it as a scene button. */
const props = defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
const spotify = useSpotifyStore()
const snackbar = useSnackbarStore()
const { t } = useI18n()

const query = ref('')
const results = ref<SpotifyItem[]>([])
const loading = ref(false)
const shown = computed(() => (query.value ? results.value : spotify.playlists))

watch(() => props.modelValue, async (open) => {
  if (!open || spotify.playlists.length) return
  loading.value = true
  await spotify.loadPlaylists()
  loading.value = false
}, { immediate: true })

let timer: ReturnType<typeof setTimeout> | null = null
function onQuery() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    const q = (query.value ?? '').trim()
    if (!q) return
    loading.value = true
    results.value = await spotify.search(q).catch(() => [])
    loading.value = false
  }, 350)
}
async function add(item: SpotifyItem) {
  await spotify.addScene(item)
  snackbar.success(t('spotify.picker.added', { name: item.name }))
}
</script>
