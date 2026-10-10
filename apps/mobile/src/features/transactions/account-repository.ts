import type { Account, AccountKind } from "./accounts"
import { getDatabase } from "./db"

interface AccountRow {
  created_at: number
  id: string
  kind: string
  name: string
}

const COLUMNS = "id, name, kind, created_at"

function rowToAccount(row: AccountRow): Account {
  return {
    createdAt: row.created_at,
    id: row.id,
    kind: row.kind as AccountKind,
    name: row.name,
  }
}

export async function listAccounts(): Promise<Account[]> {
  const database = await getDatabase()
  const rows = await database.getAllAsync<AccountRow>(
    `SELECT ${COLUMNS} FROM accounts ORDER BY created_at, name`
  )

  return rows.map(rowToAccount)
}
