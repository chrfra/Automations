import Database from 'better-sqlite3'

export function openDb(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS automations (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      url          TEXT NOT NULL,
      method       TEXT NOT NULL CHECK(method IN ('GET','POST','PUT','PATCH','DELETE')),
      headers      TEXT NOT NULL DEFAULT '{}',
      body         TEXT,
      api_key_enc  TEXT,
      transform_type TEXT CHECK(transform_type IN ('xslt','liquid')),
      template     TEXT,
      created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      automation_id  INTEGER NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
      enabled        INTEGER NOT NULL DEFAULT 0,
      schedule_type  TEXT NOT NULL CHECK(schedule_type IN ('interval','weekly','monthly','cron')),
      schedule_value TEXT NOT NULL,
      start_at       INTEGER,
      created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `)
}
