import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite"

const DATABASE_NAME = "plata.db"

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  amount INTEGER NOT NULL,
  category_id TEXT NOT NULL,
  confidence REAL,
  created_at INTEGER NOT NULL,
  currency TEXT NOT NULL,
  kind TEXT NOT NULL,
  merchant TEXT,
  note TEXT,
  occurred_at INTEGER NOT NULL,
  raw_ref TEXT,
  source TEXT NOT NULL,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON transactions (occurred_at);
CREATE INDEX IF NOT EXISTS idx_transactions_state ON transactions (state);
`

let databasePromise: Promise<SQLiteDatabase> | null = null

async function initializeDatabase(): Promise<SQLiteDatabase> {
  const database = await openDatabaseAsync(DATABASE_NAME)
  await database.execAsync(SCHEMA)
  return database
}

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = initializeDatabase().catch((error: unknown) => {
      // Don't cache a rejected promise: allow a later call to retry initialization.
      databasePromise = null
      throw error
    })
  }

  return databasePromise
}
