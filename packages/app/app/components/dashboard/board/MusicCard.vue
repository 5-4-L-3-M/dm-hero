<template>
  <div v-if="spotify.status?.connected" class="d-flex flex-column ga-3">
    <SpotifyNowPlaying compact />
    <SpotifySceneButtons compact shuffle />
  </div>
  <div v-else class="text-body-medium text-medium-emphasis">
    {{ $t('dashboardBoards.cards.music.notConnected') }}
    <v-btn variant="text" size="small" color="primary" to="/music">{{ $t('dashboardBoards.cards.music.setUp') }}</v-btn>
  </div>
</template>

<script setup lang="ts">
/** Spotify remote and the campaign's scene buttons, right on the dashboard. */
const spotify = useSpotifyStore()
onMounted(() => spotify.loadStatus())
</script>
