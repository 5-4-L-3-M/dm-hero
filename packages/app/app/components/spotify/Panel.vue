<template>
  <v-card variant="outlined" class="mb-4 spotify-panel">
    <v-card-title class="d-flex align-center flex-wrap ga-2">
      <v-icon color="success">mdi-spotify</v-icon>
      <span>Spotify</span>
      <v-chip v-if="spotify.status?.connected && spotify.status.user" size="small" variant="tonal" color="success" prepend-icon="mdi-account">{{ spotify.status.user }}</v-chip>
      <v-spacer />
      <template v-if="spotify.status?.connected">
        <v-btn size="small" variant="tonal" prepend-icon="mdi-playlist-music" @click="picker = true">{{ $t('spotify.browse') }}</v-btn>
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-dots-vertical" size="small" variant="text" />
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-key" :title="$t('spotify.setup.change')" @click="editing = true" />
            <v-list-item prepend-icon="mdi-link-off" :title="$t('spotify.disconnect')" @click="spotify.disconnect()" />
          </v-list>
        </v-menu>
      </template>
    </v-card-title>

    <v-card-text>
      <!-- 1. Your own Spotify developer app -->
      <div v-if="!spotify.status?.configured || editing">
        <p class="text-body-medium mb-2">{{ $t('spotify.setup.intro') }}</p>
        <ol class="text-body-medium mb-3 pl-5">
          <li>{{ $t('spotify.setup.step1') }} <a href="#" @click.prevent="openDashboard">developer.spotify.com/dashboard</a></li>
          <li>{{ $t('spotify.setup.step2') }} <code class="redirect">{{ spotify.status?.redirectUri }}</code></li>
          <li>{{ $t('spotify.setup.step3') }}</li>
        </ol>
        <div class="d-flex ga-2 align-center" style="max-width: 560px">
          <v-text-field v-model="clientIdText" :label="$t('spotify.setup.clientId')" variant="outlined" density="compact" hide-details />
          <v-btn color="primary" variant="flat" :disabled="!clientIdText.trim()" @click="saveId">{{ $t('common.save') }}</v-btn>
          <v-btn v-if="editing" variant="text" @click="editing = false">{{ $t('common.cancel') }}</v-btn>
        </div>
      </div>

      <!-- 2. Log in -->
      <div v-else-if="!spotify.status?.connected" class="d-flex align-center flex-wrap ga-3">
        <span class="text-body-medium">{{ $t('spotify.connectHint') }}</span>
        <v-btn color="success" variant="flat" prepend-icon="mdi-spotify" :loading="connecting" @click="connect">{{ $t('spotify.connect') }}</v-btn>
        <v-btn variant="text" size="small" @click="editing = true">{{ $t('spotify.setup.change') }}</v-btn>
      </div>

      <!-- 3. The remote -->
      <template v-else>
        <SpotifyNowPlaying />
        <v-alert v-if="spotify.playback && !spotify.playback.active" type="info" variant="tonal" density="compact" class="mt-3">{{ $t('spotify.openApp') }}</v-alert>
        <div class="d-flex align-center flex-wrap ga-2 mt-4">
          <span class="text-body-small font-weight-bold text-medium-emphasis mr-1">{{ $t('spotify.scenes.title') }}</span>
          <v-btn size="x-small" variant="text" :color="shuffleScenes ? 'success' : undefined" prepend-icon="mdi-shuffle-variant" :title="$t('spotify.scenes.shuffleHint')" @click="shuffleScenes = !shuffleScenes">
            {{ shuffleScenes ? $t('spotify.scenes.shuffled') : $t('spotify.scenes.inOrder') }}
          </v-btn>
        </div>
        <SpotifySceneButtons class="mt-2" :shuffle="shuffleScenes" @add="picker = true" />
      </template>
    </v-card-text>
    <SpotifyPicker v-model="picker" />
  </v-card>
</template>

<script setup lang="ts">
/** Spotify on the Music page: set up once, then a remote and the campaign's scene buttons. */
const spotify = useSpotifyStore()
const picker = ref(false)
const editing = ref(false)
const connecting = ref(false)
const clientIdText = ref('')
const shuffleScenes = ref(true)

onMounted(() => spotify.loadStatus())

async function saveId() {
  await spotify.saveClientId(clientIdText.value)
  clientIdText.value = ''
  editing.value = false
}
async function connect() {
  connecting.value = true
  try {
    await spotify.connect()
  }
  finally {
    connecting.value = false
  }
}
function openDashboard() {
  useElectron().openExternalUrl('https://developer.spotify.com/dashboard')
}
</script>

<style scoped>
.redirect {
  user-select: all;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
