<template>
  <div class="d-flex flex-wrap align-center ga-2">
    <div v-for="s in spotify.scenes" :key="s.id" class="scene-wrap">
      <v-chip
        :color="playingScene === s.uri ? 'success' : 'primary'"
        :variant="playingScene === s.uri ? 'flat' : 'tonal'"
        :size="compact ? 'small' : 'default'"
        @click="spotify.play(s.uri, shuffle)"
      >
        <v-avatar v-if="s.image" start><v-img :src="s.image" cover /></v-avatar>
        <v-icon v-else start>{{ playingScene === s.uri ? 'mdi-volume-high' : 'mdi-music' }}</v-icon>
        {{ s.name }}
        <v-menu v-if="!compact">
          <template #activator="{ props: menuProps }">
            <v-icon v-bind="menuProps" end size="small" @click.stop>mdi-dots-vertical</v-icon>
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-pencil" :title="$t('spotify.scenes.rename')" @click="startRename(s.id, s.name)" />
            <v-list-item prepend-icon="mdi-arrow-left" :title="$t('spotify.scenes.moveLeft')" @click="move(s.id, -1)" />
            <v-list-item prepend-icon="mdi-delete" :title="$t('spotify.scenes.remove')" @click="spotify.removeScene(s.id)" />
          </v-list>
        </v-menu>
      </v-chip>
    </div>
    <v-btn v-if="!compact" size="small" variant="text" color="primary" prepend-icon="mdi-plus" @click="$emit('add')">{{ $t('spotify.scenes.add') }}</v-btn>
    <span v-if="!spotify.scenes.length && compact" class="text-body-small text-medium-emphasis">{{ $t('spotify.scenes.none') }}</span>

    <v-dialog v-model="renaming" max-width="380">
      <v-card :title="$t('spotify.scenes.rename')">
        <v-card-text>
          <v-text-field v-model="newName" autofocus variant="outlined" density="comfortable" hide-details @keyup.enter="saveRename" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="renaming = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveRename">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
/** The campaign's mood buttons: one click plays that playlist. */
const props = defineProps<{ compact?: boolean, shuffle?: boolean }>()
defineEmits<{ add: [] }>()
const spotify = useSpotifyStore()
const campaign = useCampaignStore()
watch(() => campaign.activeCampaignIdNumber, id => spotify.loadScenes(id), { immediate: true })

const playingScene = computed(() => (spotify.playback?.playing ? spotify.playback.context : null))
const shuffle = computed(() => props.shuffle)

const renaming = ref(false)
const renameId = ref<number | null>(null)
const newName = ref('')
function startRename(id: number, name: string) {
  renameId.value = id
  newName.value = name
  renaming.value = true
}
async function saveRename() {
  if (renameId.value && newName.value.trim()) await spotify.renameScene(renameId.value, newName.value.trim())
  renaming.value = false
}
function move(id: number, by: number) {
  const ids = spotify.scenes.map(s => s.id)
  const i = ids.indexOf(id)
  const j = Math.max(0, Math.min(ids.length - 1, i + by))
  if (i === j) return
  ids.splice(i, 1)
  ids.splice(j, 0, id)
  spotify.orderScenes(ids)
}
</script>
