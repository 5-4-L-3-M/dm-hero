/**
 * Readable label for a relation key ("livesIn" → "Lives in"). Relation keys
 * are translated in several i18n sections depending on what they connect, so
 * check each (te() first, which avoids missing-key warnings). Unknown keys are
 * user-entered text and shown as-is.
 */
export function useRelationLabel() {
  const { t, te } = useI18n()

  function relationLabel(relationType: string | null | undefined): string {
    if (!relationType) return ''
    const keys = [
      `npcs.npcRelationTypes.${relationType}`,
      `npcs.relationTypes.${relationType}`,
      `npcs.itemRelationTypes.${relationType}`,
      `factions.relationTypes.${relationType}`,
      `factions.factionRelationTypes.${relationType}`,
      `items.relationTypes.${relationType}`,
      `items.ownerRelationTypes.${relationType}`,
      `items.itemRelationTypes.${relationType}`,
      `locations.relationTypes.${relationType}`,
      `lore.relationTypes.${relationType}`,
      `players.relationTypes.${relationType}`,
      `chaos.relationTypes.${relationType}`,
    ]
    for (const key of keys) {
      if (te(key)) return capitalize(t(key))
    }
    // Untranslated key-style values ("part_of", "sworn_to", "watchesOver") →
    // readable words; free text the user typed stays as it is.
    if (/^[a-z]+(?:_[a-z]+|[A-Z][a-z]+)+$/.test(relationType)) {
      return capitalize(relationType.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase())
    }
    return relationType
  }

  function capitalize(text: string): string {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
  }

  return { relationLabel }
}
