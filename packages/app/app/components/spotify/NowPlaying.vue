<template>
  <div class="now d-flex align-center ga-3" :class="{ 'now--compact': compact }">
    <v-avatar :size="compact ? 48 : 72" rounded="lg" color="surface-variant">
      <v-img v-if="pb?.image" :src="pb.image" cover />
      <v-icon v-else>mdi-spotify</v-icon>
    </v-avatar>
    <div class="flex-grow-1" style="min-width: 0">
      <template v-if="pb?.track">
        <div class="font-weight-bold text-truncate" :class="compact ? 'text-body-medium' : 'text-title-medium'">{{ pb.track }}</div>
        <div class="text-body-small text-medium-emphasis text-truncate">{{ pb.artist }}</div>
        <div v-if="pb.device && !compact" class="text-body-small text-medium-emphasis text-truncate">
          <v-icon size="x-small" class="mr-1">mdi-speaker</v-icon>{{ pb.device }}
        </div>
      </template>
      <div v-else class="text-body-medium text-medium-emphasis">{{ $t('spotify.nothing') }}</div>
      <div class="d-flex align-center ga-1 mt-1">
        <v-btn icon="mdi-skip-previous" size="small" variant="text" :disabled="spotify.busy" :title="$t('spotify.previous')" @click="spotify.command('previous')" />
        <v-btn :icon="pb?.playing ? 'mdi-pause' : 'mdi-play'" size="small" color="success" variant="flat" :loading="spotify.busy" :title="pb?.playing ? $t('spotify.pause') : $t('spotify.play')" @click="spotify.togglePlay()" />
        <v-btn icon="mdi-skip-next" size="small" variant="text" :disabled="spotify.busy" :title="$t('spotify.next')" @click="spotify.command('next')" />
        <v-btn icon="mdi-shuffle-variant" size="small" variant="text" :color="pb?.shuffle ? 'success' : undefined" :title="$t('spotify.shuffle')" @click="spotify.setShuffle(!pb?.shuffle)" />
        <v-slider
          v-if="pb?.volume !== null && pb?.volume !== undefined"
          :model-value="pb.volume"
          :min="0"
          :max="100"
          :step="5"
          density="compact"
          hide-details
          color="success"
          prepend-icon="mdi-volume-medium"
          class="ml-2 volume"
          @end="spotify.setVolume($event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** What Spotify is playing, with the remote buttons. */
defineProps<{ compact?: boolean }>()
const spotify = useSpotifyStore()
const pb = computed(() => spotify.playback)
onMounted(() => spotify.watch())
onBeforeUnmount(() => spotify.unwatch())
</script>

<style scoped>
.volume {
  max-width: 180px;
  min-width: 90px;
}
</style>
