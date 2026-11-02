import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { migrations } from '../../server/utils/migrations'

// Migration 81: an existing roster becomes the campaign's first named roster
describe('migration 81', () => {
  it('puts every existing roster place into a first roster per campaign', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    db.exec(`
      CREATE TABLE campaigns (id INTEGER PRIMARY KEY, name TEXT);
      CREATE TABLE roster_places (id INTEGER PRIMARY KEY AUTOINCREMENT, campaign_id INTEGER NOT NULL, location_id INTEGER NOT NULL,
        category TEXT, sort_order INTEGER NOT NULL DEFAULT 0, UNIQUE(campaign_id, location_id));
      INSERT INTO campaigns VALUES (1, 'Aevum'), (2, 'Other'), (3, 'Empty');
      INSERT INTO roster_places (campaign_id, location_id) VALUES (1, 10), (1, 11), (2, 20);
    `)
    db.exec('BEGIN')
    migrations.find(m => m.version === 81)!.up(db)
    db.exec('COMMIT')
    const books = db.prepare('SELECT id, campaign_id, name FROM roster_books ORDER BY campaign_id').all() as Array<{ id: number, campaign_id: number, name: string }>
    expect(books.map(b => [b.campaign_id, b.name])).toEqual([[1, 'Main roster'], [2, 'Main roster']])
    expect(db.prepare('SELECT location_id, book_id FROM roster_places ORDER BY location_id').all()).toEqual([
      { location_id: 10, book_id: books[0]!.id }, { location_id: 11, book_id: books[0]!.id }, { location_id: 20, book_id: books[1]!.id },
    ])
    // Deleting a roster leaves its places without one (the app then shows them in the first roster)
    db.prepare('DELETE FROM roster_books WHERE id = ?').run(books[1]!.id)
    expect(db.prepare('SELECT book_id FROM roster_places WHERE location_id = 20').get()).toEqual({ book_id: null })
  })
})
