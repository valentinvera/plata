import { getDatabase } from "./db"
import { resetLocalDatabase } from "./local-reset-storage"

export async function resetLocalData(): Promise<void> {
  const database = await getDatabase()
  await resetLocalDatabase(database)
}
