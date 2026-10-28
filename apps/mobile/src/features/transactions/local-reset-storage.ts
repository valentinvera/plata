import { DEFAULT_ACCOUNTS } from "./accounts"

interface ResetDatabase {
  runAsync: (sql: string, ...params: (string | number)[]) => Promise<unknown>
  withTransactionAsync: (task: () => Promise<void>) => Promise<void>
}

const CLEAR_SQL = [
  "DELETE FROM transactions",
  "DELETE FROM budgets",
  "DELETE FROM categories",
  "DELETE FROM accounts",
  "DELETE FROM app_meta WHERE key GLOB 'sync_*' OR key IN ('preferences', 'reminder_cycle')",
]

// Restore canonical accounts, including ones the user renamed or deleted.
// Keep onboarding and unrelated application metadata, but no personal labels.
export async function resetLocalDatabase(
  database: ResetDatabase,
  now: number = Date.now()
): Promise<void> {
  await database.withTransactionAsync(async () => {
    for (const sql of CLEAR_SQL) {
      // biome-ignore lint/performance/noAwaitInLoops: Propagate each SQLite failure before seeding or committing the reset.
      await database.runAsync(sql)
    }
    const placeholders = DEFAULT_ACCOUNTS.map(() => "(?, ?, ?, ?)").join(", ")
    const values = DEFAULT_ACCOUNTS.flatMap((account) => [
      account.id,
      account.name,
      account.kind,
      now,
    ])
    await database.runAsync(
      `INSERT INTO accounts (id, name, kind, created_at) VALUES ${placeholders}`,
      ...values
    )
  })
}
