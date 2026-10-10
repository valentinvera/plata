import { getDatabase } from "./db"

export async function getAppMeta(key: string): Promise<string | null> {
  const database = await getDatabase()
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    key
  )

  return row?.value ?? null
}

export async function setAppMeta(key: string, value: string): Promise<void> {
  const database = await getDatabase()
  await database.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    key,
    value
  )
}
