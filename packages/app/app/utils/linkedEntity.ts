/**
 * The id of the *other* entry in a linked row (relation lists, linked NPCs,
 * items, lore …). Rows carry either an explicit entity_id or the raw relation
 * ends plus a direction. Returns null when it can't be told safely, so the
 * name stays plain text instead of opening the wrong entry.
 */
export function linkedEntityId(row: {
  entity_id?: number | null
  direction?: 'outgoing' | 'incoming' | string | null
  from_entity_id?: number | null
  to_entity_id?: number | null
}): number | null {
  if (row.entity_id) return row.entity_id
  if (row.direction === 'outgoing' && row.to_entity_id) return row.to_entity_id
  if (row.direction === 'incoming' && row.from_entity_id) return row.from_entity_id
  return null
}
