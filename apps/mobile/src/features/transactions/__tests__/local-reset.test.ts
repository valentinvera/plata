import { Database } from "bun:sqlite"
import { afterEach, describe, expect, it } from "bun:test"

import { DEFAULT_ACCOUNTS } from "../accounts"
import { resetLocalDatabase } from "../local-reset-storage"

const NOW = 1_700_000_000_000
const databases: Database[] = []

afterEach(() => {
  for (const database of databases) {
    database.close()
  }
  databases.length = 0
})

function harness() {
  const database = new Database(":memory:")
  databases.push(database)
  database.exec(`
    CREATE TABLE transactions (id TEXT PRIMARY KEY, amount INTEGER);
    CREATE TABLE budgets (category_id TEXT PRIMARY KEY, amount INTEGER);
    CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE accounts (id TEXT PRIMARY KEY, name TEXT, kind TEXT, created_at INTEGER);
    CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT);
    INSERT INTO transactions VALUES ('personal-tx', 50000);
    INSERT INTO budgets VALUES ('personal-category', 100000);
    INSERT INTO categories VALUES ('personal-category', 'Personal label');
    INSERT INTO accounts VALUES ('cash', 'Personal cash label', 'cash', 1);
    INSERT INTO accounts VALUES ('custom-account', 'Personal bank label', 'card', 2);
    INSERT INTO app_meta VALUES
      ('preferences', 'personal preferences'),
      ('sync_cursor:user', 'personal cursor'),
      ('sync_state', 'personal sync state'),
      ('reminder_cycle', 'personal activity timestamp'),
      ('onboarding_completed', '1'),
      ('accounts_seeded', '1'),
      ('syncro_theme', 'preserve unrelated setting');
  `)
  const adapter = {
    runAsync(sql: string, ...params: (string | number)[]) {
      try {
        return Promise.resolve(database.run(sql, params))
      } catch (error) {
        return Promise.reject(error)
      }
    },
    async withTransactionAsync(task: () => Promise<void>) {
      database.exec("BEGIN")
      try {
        await task()
        database.exec("COMMIT")
      } catch (error) {
        database.exec("ROLLBACK")
        throw error
      }
    },
  }
  return { adapter, database }
}

function accounts(database: Database) {
  return database
    .query("SELECT id, name, kind, created_at FROM accounts ORDER BY id")
    .all()
}

describe("local sign-out data reset", () => {
  it("removes custom accounts and restores renamed or deleted defaults", async () => {
    const { adapter, database } = harness()
    await resetLocalDatabase(adapter, NOW)
    expect(accounts(database)).toEqual(
      [...DEFAULT_ACCOUNTS]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((account) => ({
          ...account,
          created_at: NOW,
        }))
    )
  })

  it("clears transactions, budgets and custom categories", async () => {
    const { adapter, database } = harness()
    await resetLocalDatabase(adapter, NOW)
    expect(database.query("SELECT * FROM transactions").all()).toEqual([])
    expect(database.query("SELECT * FROM budgets").all()).toEqual([])
    expect(database.query("SELECT * FROM categories").all()).toEqual([])
  })

  it("clears personal metadata while preserving onboarding and application settings", async () => {
    const { adapter, database } = harness()
    await resetLocalDatabase(adapter, NOW)
    expect(
      database.query("SELECT key, value FROM app_meta ORDER BY key").all()
    ).toEqual([
      { key: "accounts_seeded", value: "1" },
      { key: "onboarding_completed", value: "1" },
      { key: "syncro_theme", value: "preserve unrelated setting" },
    ])
  })

  it("rolls back earlier deletions if a later delete fails", async () => {
    const { adapter, database } = harness()
    database.exec(`CREATE TRIGGER fail_reset BEFORE DELETE ON budgets
      BEGIN SELECT RAISE(ABORT, 'Reset unavailable'); END;`)
    const originalAccounts = accounts(database)

    await expect(resetLocalDatabase(adapter, NOW)).rejects.toThrow(
      "Reset unavailable"
    )
    expect(database.query("SELECT * FROM transactions").all()).toEqual([
      { id: "personal-tx", amount: 50_000 },
    ])
    expect(accounts(database)).toEqual(originalAccounts)
    expect(
      database
        .query("SELECT value FROM app_meta WHERE key = 'preferences'")
        .get()
    ).toEqual({ value: "personal preferences" })
  })

  it("rolls back the reset if restoring default accounts fails", async () => {
    const { adapter, database } = harness()
    database.exec(`CREATE TRIGGER fail_seed BEFORE INSERT ON accounts
      WHEN NEW.id = 'card' BEGIN SELECT RAISE(ABORT, 'Seed unavailable'); END;`)
    const originalAccounts = accounts(database)

    await expect(resetLocalDatabase(adapter, NOW)).rejects.toThrow(
      "Seed unavailable"
    )
    expect(accounts(database)).toEqual(originalAccounts)
    expect(database.query("SELECT * FROM categories").all()).toEqual([
      { id: "personal-category", name: "Personal label" },
    ])
    expect(
      database
        .query("SELECT value FROM app_meta WHERE key = 'preferences'")
        .get()
    ).toEqual({ value: "personal preferences" })
  })

  it("can run again without duplicating or losing default accounts", async () => {
    const { adapter, database } = harness()
    await resetLocalDatabase(adapter, NOW)
    await resetLocalDatabase(adapter, NOW)
    expect(accounts(database)).toHaveLength(DEFAULT_ACCOUNTS.length)
    expect(database.query("SELECT * FROM transactions").all()).toEqual([])
  })
})
