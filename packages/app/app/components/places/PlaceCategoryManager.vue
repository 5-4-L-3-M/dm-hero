<template>
  <v-dialog :model-value="modelValue" max-width="560" scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex align-center"><v-icon class="mr-2">mdi-shape-outline</v-icon>{{ $t('places.categories') }}</v-card-title>
      <v-card-text>
        <div v-for="c in places.categories" :key="c.id" class="d-flex align-center ga-2 mb-2">
          <v-menu :close-on-content-click="false">
            <template #activator="{ props: menu }">
              <button v-bind="menu" type="button" class="swatch" :style="{ background: c.color }" :aria-label="$t('story.storyline.color')">
                <v-icon size="small" color="white">{{ c.icon }}</v-icon>
              </button>
            </template>
            <v-card class="pa-3" width="260">
              <div class="d-flex flex-wrap ga-2 mb-3">
                <button v-for="col in COLORS" :key="col" type="button" class="swatch swatch--small" :class="{ 'swatch--on': col === c.color }" :style="{ background: col }" @click="places.updateCategory(c.id, { color: col })" />
              </div>
              <div class="d-flex flex-wrap ga-1">
                <v-btn v-for="ic in ICONS" :key="ic" :icon="ic" size="small" :variant="ic === c.icon ? 'flat' : 'text'" @click="places.updateCategory(c.id, { icon: ic })" />
              </div>
            </v-card>
          </v-menu>
          <v-text-field :model-value="c.name" variant="outlined" density="compact" hide-details @change="(e: Event) => places.updateCategory(c.id, { name: (e.target as HTMLInputElement).value })" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" :aria-label="$t('common.delete')" @click="places.removeCategory(c.id)" />
        </div>
        <div class="d-flex ga-2 mt-4">
          <v-text-field v-model="newName" :placeholder="$t('places.newCategory')" variant="outlined" density="compact" hide-details @keyup.enter="add" />
          <v-btn color="primary" variant="flat" :disabled="!newName.trim()" @click="add">{{ $t('common.add') }}</v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
/** Name, colour and icon of each place category (map pins, roster headings). */
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
const places = usePlacesStore()
const newName = ref('')
const COLORS = ['#E06666', '#F6B26B', '#FFD966', '#93C47D', '#6AA84F', '#76A5AF', '#6FA8DC', '#3D85C6', '#8E7CC3', '#C27BA0', '#A61C00', '#999999']
const ICONS = ['mdi-storefront', 'mdi-glass-mug-variant', 'mdi-bank', 'mdi-candle', 'mdi-shield-account', 'mdi-flower', 'mdi-pine-tree', 'mdi-skull', 'mdi-city', 'mdi-home', 'mdi-castle', 'mdi-anchor', 'mdi-book-open-variant', 'mdi-sword', 'mdi-music', 'mdi-map-marker']
async function add() {
  const name = newName.value.trim()
  if (!name) return
  newName.value = ''
  await places.addCategory(name)
}
</script>

<style scoped>
.swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(var(--v-theme-on-surface), 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}
.swatch--small {
  width: 26px;
  height: 26px;
}
.swatch--on {
  border-color: rgb(var(--v-theme-on-surface));
}
</style>
