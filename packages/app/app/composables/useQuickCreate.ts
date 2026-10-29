/**
 * Create an entry straight from a picker: type a name that doesn't exist yet,
 * pick "Create …", and a new page with that name is made and selected. Details
 * can be filled in later on its page.
 */
export type QuickCreateType = 'NPC' | 'Location' | 'Item' | 'Faction' | 'Lore'

const API: Record<QuickCreateType, string> = { NPC: 'npcs', Location: 'locations', Item: 'items', Faction: 'factions', Lore: 'lore' }

/** "Half-Orc Warlord" → "half_orc_warlord" (Reference Data keys: a-z and _ , max 20) */
export function referenceKey(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20)
}

export function useQuickCreate() {
  const campaignStore = useCampaignStore()
  const entitiesStore = useEntitiesStore()
  const storyStore = useStoryBoardStore()

  async function createEntity(type: QuickCreateType, name: string): Promise<{ id: number, name: string, type: QuickCreateType }> {
    const campaignId = campaignStore.activeCampaignId
    const created = await $fetch<{ id: number, name: string }>(`/api/${API[type]}`, {
      method: 'POST',
      body: { name: name.trim(), campaignId },
    })
    // Refresh the lists other pickers read from
    if (campaignId) {
      const refresh: Record<QuickCreateType, () => Promise<unknown>> = {
        NPC: () => entitiesStore.fetchNPCs(campaignId, true),
        Location: () => entitiesStore.fetchLocations(campaignId, true),
        Item: () => entitiesStore.fetchItems(campaignId, true),
        Faction: () => entitiesStore.fetchFactions(campaignId, true),
        Lore: () => entitiesStore.fetchLore(campaignId, true),
      }
      await refresh[type]().catch(() => null)
    }
    if (storyStore.campaignId) {
      storyStore.entities.push({ id: created.id, name: created.name, type })
      if (type === 'Location') storyStore.locations.push({ id: created.id, name: created.name, parent_id: null })
    }
    return { id: created.id, name: created.name, type }
  }

  /** A custom race or class in Reference Data; returns its key (existing key if the name is taken). */
  async function createReference(kind: 'races' | 'classes', name: string): Promise<string> {
    const label = name.trim()
    const key = referenceKey(label) || `custom_${Date.now().toString(36)}`
    try {
      await $fetch(`/api/${kind}`, { method: 'POST', body: { name: key, name_de: label, name_en: label } })
    }
    catch (err) {
      if ((err as { statusCode?: number }).statusCode !== 409) throw err
    }
    return key
  }

  return { createEntity, createReference }
}
