import { getDatabase } from "./db"

// Removes the data that belongs to the signed-in account on this device:
// transactions, budgets and custom categories, plus the sync and preference
// state. Keeps the built-in accounts and the onboarding flag.
const CLEAR_SQL = [
  "DELETE FROM transactions",
  "DELETE FROM budgets",
  "DELETE FROM categories",
  "DELETE FROM app_meta WHERE key LIKE 'sync_%' OR key = 'preferences'",
].join("; ")

export async function resetLocalData(): Promise<void> {
  const database = await getDatabase()
  await database.execAsync(CLEAR_SQL)
}
