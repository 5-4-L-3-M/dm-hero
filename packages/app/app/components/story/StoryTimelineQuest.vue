<template>
  <v-card
    class="tl-quest"
    :class="{ 'tl-quest--optional': optional, 'tl-quest--minor': importance === 'minor' }"
    :style="{ '--status-color': `rgb(var(--v-theme-${STATUS_COLORS[quest.status]}))` }"
    variant="flat"
    border
  >
    <div class="d-flex align-start pa-2 pb-1">
      <v-icon size="small" class="mr-1 mt-1" :title="importance === 'major' ? $t('quests.major') : $t('quests.minor')">
        {{ importance === 'major' ? 'mdi-star' : 'mdi-star-outline' }}
      </v-icon>
      <span class="tl-quest__name flex-grow-1" role="button" tabindex="0" @click="open" @keydown.enter="open">{{ quest.name }}</span>
      <v-btn icon="mdi-pencil" size="x-small" variant="text" :aria-label="$t('common.edit')" @click="$emit('edit', quest)" />
    </div>
    <div class="d-flex flex-wrap ga-1 px-2 pb-2">
      <v-chip size="x-small" :color="STATUS_COLORS[quest.status]" variant="tonal">
        <v-icon start size="x-small">{{ QUEST_STATUS_ICONS[quest.status] }}</v-icon>{{ $t(`quests.statuses.${quest.status}`) }}
      </v-chip>
      <v-chip v-if="optional" size="x-small" variant="outlined">{{ $t('quests.optional') }}</v-chip>
      <v-chip v-if="quest.objectives.length" size="x-small" variant="tonal">{{ doneCount }}/{{ quest.objectives.length }}</v-chip>
    </div>
    <div v-if="quest.givers.length || quest.giver_hidden" class="tl-quest__givers px-2 pb-2 text-body-small">
      <v-icon size="x-small" class="mr-1">{{ quest.giver_hidden ? 'mdi-eye-off' : 'mdi-account-voice' }}</v-icon>
      <span v-if="quest.giver_hidden" class="text-medium-emphasis mr-1">{{ $t('quests.giverHiddenShort') }}{{ quest.givers.length ? ':' : '' }}</span>
      <template v-for="(g, i) in quest.givers" :key="g.id">
        <SharedEntityLink :id="g.id" :type="g.type" :name="g.name" :class="{ 'text-medium-emphasis': quest.giver_hidden }" /><span v-if="i < quest.givers.length - 1">, </span>
      </template>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { QUEST_STATUS_ICONS, effectiveImportance, effectiveOptional, type Quest, type QuestStatus, type Questline } from '~~/types/story'

/** One quest on the Timeline: status, major/minor, optional, givers. */
const props = defineProps<{ quest: Quest, line: Questline | null }>()
defineEmits<{ edit: [quest: Quest] }>()

const STATUS_COLORS: Record<QuestStatus, string> = { rumor: 'warning', active: 'primary', completed: 'success', failed: 'error' }

const tabs = useEntityTabsStore()
const store = useStoryBoardStore()
// The drag list may hold an older copy; show the store's current one
const quest = computed(() => store.quests.find(q => q.id === props.quest.id) ?? props.quest)
const importance = computed(() => effectiveImportance(quest.value, props.line))
const optional = computed(() => effectiveOptional(quest.value, props.line))
const doneCount = computed(() => quest.value.objectives.filter(o => o.done).length)

function open() {
  tabs.open('quest', quest.value.id, quest.value.name)
}
</script>

<style scoped>
.tl-quest {
  width: 230px;
  border-left: 5px solid var(--status-color) !important;
  cursor: grab;
}
.tl-quest--minor {
  width: 200px;
  opacity: 0.92;
}
.tl-quest--minor .tl-quest__name {
  font-weight: 500;
  font-size: 0.9rem;
}
.tl-quest--optional {
  border-style: dashed dashed dashed solid !important;
}
.tl-quest__name {
  font-weight: 700;
  cursor: pointer;
  line-height: 1.3;
  padding-top: 2px;
}
.tl-quest__givers {
  line-height: 1.5;
}
</style>
