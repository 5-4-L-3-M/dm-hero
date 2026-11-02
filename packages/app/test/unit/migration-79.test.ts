import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { migrations } from '../../server/utils/migrations'

// Migration 79 rebuilds the combatant tables; the effects must survive it.
describe('migration 79', () => {
  it('keeps participants and their effects', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    db.exec(`
      CREATE TABLE campaigns (id INTEGER PRIMARY KEY, name TEXT);
      CREATE TABLE entity_types (id INTEGER PRIMARY KEY, name TEXT);
      CREATE TABLE entities (id INTEGER PRIMARY KEY, campaign_id INTEGER, type_id INTEGER, name TEXT);
      CREATE TABLE encounters (id INTEGER PRIMARY KEY, campaign_id INTEGER, name TEXT);
      CREATE TABLE encounter_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT, encounter_id INTEGER NOT NULL, entity_id INTEGER NOT NULL, display_name TEXT NOT NULL,
        duplicate_index INTEGER NOT NULL DEFAULT 0, initiative INTEGER, current_hp INTEGER NOT NULL DEFAULT 0, max_hp INTEGER NOT NULL DEFAULT 0,
        temp_hp INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, is_ko INTEGER NOT NULL DEFAULT 0, notes TEXT,
        FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE, FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE);
      CREATE TABLE encounter_effects (
        id INTEGER PRIMARY KEY AUTOINCREMENT, participant_id INTEGER NOT NULL, name TEXT NOT NULL, icon TEXT,
        duration_type TEXT NOT NULL DEFAULT 'infinite', duration_rounds INTEGER, remaining_rounds INTEGER,
        FOREIGN KEY (participant_id) REFERENCES encounter_participants(id) ON DELETE CASCADE);
      INSERT INTO campaigns VALUES (1, 'Aevum');
      INSERT INTO entity_types VALUES (1, 'NPC');
      INSERT INTO entities VALUES (5, 1, 1, 'Guard');
      INSERT INTO encounters VALUES (2, 1, 'The guards');
      INSERT INTO encounter_participants (id, encounter_id, entity_id, display_name, current_hp, max_hp, initiative, notes) VALUES (7, 2, 5, 'Guard', 18, 22, 14, 'Shield up');
      INSERT INTO encounter_effects (participant_id, name, duration_type, duration_rounds, remaining_rounds) VALUES (7, 'Prone', 'rounds', 2, 1);
    `)
    db.exec('BEGIN')
    migrations.find(m => m.version === 79)!.up(db)
    db.exec('COMMIT')
    expect(db.prepare('SELECT id, entity_id, monster_id, current_hp, initiative, notes FROM encounter_participants').all()).toEqual([
      { id: 7, entity_id: 5, monster_id: null, current_hp: 18, initiative: 14, notes: 'Shield up' },
    ])
    expect(db.prepare('SELECT participant_id, name, remaining_rounds FROM encounter_effects').all()).toEqual([{ participant_id: 7, name: 'Prone', remaining_rounds: 1 }])
    // The effects still cascade with their participant
    db.prepare('DELETE FROM encounter_participants WHERE id = 7').run()
    expect(db.prepare('SELECT COUNT(*) AS n FROM encounter_effects').get()).toEqual({ n: 0 })
    expect(db.pragma('foreign_key_check')).toEqual([])
  })
})
