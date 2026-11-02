import type Database from 'better-sqlite3'
import { getNpcBlock } from './monsters'
import type { StatBlock } from '../../types/statblock'

/**
 * Combatants with what the combat view needs: picture, type ("Monster" for library
 * creatures), effects, and the stat block (the monster's, or the NPC's own).
 */
export function loadParticipants(db: Database.Database, encounterId: number | string, participantId?: number | string): Record<string, unknown>[] {
  const rows = db.prepare(`
    SELECT
      ep.id, ep.encounter_id, ep.entity_id, ep.monster_id, ep.display_name, ep.duplicate_index,
      ep.initiative, ep.current_hp, ep.max_hp, ep.temp_hp, ep.sort_order, ep.is_ko, ep.notes,
      CASE WHEN ep.monster_id IS NOT NULL THEN 'Monster' ELSE et.name END AS entity_type,
      COALESCE(e.image_url, m.image_url) AS entity_image,
      m.block AS monster_block
    FROM encounter_participants ep
    LEFT JOIN entities e ON e.id = ep.entity_id
    LEFT JOIN entity_types et ON et.id = e.type_id
    LEFT JOIN monsters m ON m.id = ep.monster_id
    WHERE ep.encounter_id = ? ${participantId ? 'AND ep.id = ?' : ''}
    ORDER BY ep.sort_order ASC
  `).all(...(participantId ? [encounterId, participantId] : [encounterId])) as Array<Record<string, unknown> & { monster_block: string | null, entity_id: number | null }>
  const effects = db.prepare('SELECT * FROM encounter_effects WHERE participant_id = ?')
  return rows.map(({ monster_block, ...p }) => {
    let statblock: StatBlock | null = null
    if (monster_block) {
      try {
        statblock = JSON.parse(monster_block) as StatBlock
      }
      catch {
        statblock = null
      }
    }
    else if (p.entity_id) statblock = getNpcBlock(db, p.entity_id)
    return { ...p, effects: effects.all(p.id), statblock }
  })
}
