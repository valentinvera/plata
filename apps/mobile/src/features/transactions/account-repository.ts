import type { Account, AccountKind } from "./accounts"
import { getDatabase } from "./db"
import { createId } from "./id"

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

export interface AccountInput {
  kind: AccountKind
  name: string
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const database = await getDatabase()
  const account: Account = {
    createdAt: Date.now(),
    id: createId(),
    kind: input.kind,
    name: input.name.trim(),
  }

  await database.runAsync(
    "INSERT INTO accounts (id, name, kind, created_at) VALUES (?, ?, ?, ?)",
    account.id,
    account.name,
    account.kind,
    account.createdAt
  )

  return account
}

export async function updateAccount(
  id: string,
  update: Partial<AccountInput>
): Promise<void> {
  const assignments: string[] = []
  const values: (number | string)[] = []

  if (update.name !== undefined) {
    assignments.push("name = ?")
    values.push(update.name.trim())
  }

  if (update.kind !== undefined) {
    assignments.push("kind = ?")
    values.push(update.kind)
  }

  if (assignments.length === 0) {
    return
  }

  values.push(id)

  const database = await getDatabase()
  await database.runAsync(
    `UPDATE accounts SET ${assignments.join(", ")} WHERE id = ?`,
    ...values
  )
}

export async function deleteAccount(id: string): Promise<void> {
  const database = await getDatabase()

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "UPDATE transactions SET account_id = NULL, updated_at = ?, synced_at = NULL WHERE account_id = ?",
      Date.now(),
      id
    )
    await database.runAsync("DELETE FROM accounts WHERE id = ?", id)
  })
}
