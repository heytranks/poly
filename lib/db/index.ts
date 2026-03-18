import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'data', 'arbitrage.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS matched_markets (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      predict_market_id   INTEGER NOT NULL UNIQUE,
      predict_title       TEXT NOT NULL,
      poly_condition_id   TEXT NOT NULL,
      poly_slug           TEXT,
      poly_question       TEXT,
      category            TEXT,
      predict_fee_bps     INTEGER DEFAULT 200,
      matched_at          TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS arb_episodes (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      matched_market_id   INTEGER NOT NULL REFERENCES matched_markets(id),
      title               TEXT NOT NULL,
      strategy            TEXT NOT NULL CHECK(strategy IN ('A', 'B')),
      threshold_pct       REAL NOT NULL,
      started_at          TEXT NOT NULL DEFAULT (datetime('now')),
      peak_arb_pct        REAL NOT NULL,
      peak_at             TEXT,
      ended_at            TEXT,
      duration_seconds    INTEGER,
      status              TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED'))
    );

    CREATE INDEX IF NOT EXISTS idx_episodes_status ON arb_episodes(status);
    CREATE INDEX IF NOT EXISTS idx_episodes_market ON arb_episodes(matched_market_id);
    CREATE INDEX IF NOT EXISTS idx_matched_poly ON matched_markets(poly_condition_id);
  `);
}
