import type { SQLiteDatabase } from "expo-sqlite"

import { ALL_ACCOUNTS, accountFilterClause } from "./accounts"
import { getDatabase } from "./db"
import { buildTransactionFilter, type TransactionFilter } from "./filters"
import { createId } from "./id"
import { rowToTransaction, type TransactionRow } from "./row"
import type { NewTransaction, Transaction, TransactionState } from "./types"

export const TRANSACTION_COLUMNS =
  "id, amount, category_id, confidence, created_at, currency, kind, merchant, note, occurred_at, raw_ref, source, state, updated_at, account_id"

const INSERT_SQL = `INSERT INTO transactions (${TRANSACTION_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

export const TRANSACTIONS_PAGE_SIZE = 100

export interface TransactionUpdate {
  accountId?: string | null
  amount?: number
  categoryId?: string
  merchant?: string | null
}

const UPDATE_COLUMNS: readonly [keyof TransactionUpdate, string][] = [
  ["accountId", "account_id"],
  ["amount", "amount"],
  ["categoryId", "category_id"],
  ["merchant", "merchant"],
]

function buildTransaction(input: NewTransaction, now: number): Transaction {
  return {
    accountId: input.accountId,
    amount: input.amount,
    categoryId: input.categoryId,
    confidence: input.confidence,
    createdAt: now,
    currency: input.currency,
    id: input.id ?? createId(),
    kind: input.kind,
    merchant: input.merchant,
    note: input.note,
    occurredAt: input.occurredAt,
    rawRef: input.rawRef,
    source: input.source,
    state: input.state,
    updatedAt: now,
  }
}

function insertTransaction(
  database: SQLiteDatabase,
  transaction: Transaction
): Promise<unknown> {
  return database.runAsync(
    INSERT_SQL,
    transaction.id,
    transaction.amount,
    transaction.categoryId,
    transaction.confidence,
    transaction.createdAt,
    transaction.currency,
    transaction.kind,
    transaction.merchant,
    transaction.note,
    transaction.occurredAt,
    transaction.rawRef,
    transaction.source,
    transaction.state,
    transaction.updatedAt,
    transaction.accountId
  )
}

export async function createTransaction(
  input: NewTransaction
): Promise<Transaction> {
  const database = await getDatabase()
  const transaction = buildTransaction(input, Date.now())
  await insertTransaction(database, transaction)
  return transaction
}

export async function createTransactions(
  inputs: readonly NewTransaction[]
): Promise<Transaction[]> {
  const database = await getDatabase()
  const now = Date.now()
  const transactions = inputs.map((input) => buildTransaction(input, now))

  await database.withTransactionAsync(async () => {
    await Promise.all(
      transactions.map((transaction) =>
        insertTransaction(database, transaction)
      )
    )
  })

  return transactions
}

export async function listTransactions(
  limit = TRANSACTIONS_PAGE_SIZE
): Promise<Transaction[]> {
  const database = await getDatabase()
  const rows = await database.getAllAsync<TransactionRow>(
    `SELECT ${TRANSACTION_COLUMNS} FROM transactions WHERE deleted_at IS NULL ORDER BY occurred_at DESC LIMIT ?`,
    limit
  )

  return rows.map(rowToTransaction)
}

export async function listTransactionsInRange(
  start: number,
  end: number
): Promise<Transaction[]> {
  const database = await getDatabase()
  const rows = await database.getAllAsync<TransactionRow>(
    `SELECT ${TRANSACTION_COLUMNS} FROM transactions WHERE deleted_at IS NULL AND occurred_at >= ? AND occurred_at < ? ORDER BY occurred_at DESC`,
    start,
    end
  )

  return rows.map(rowToTransaction)
}

export async function listTransactionsByState(
  state: TransactionState,
  accountFilter: string = ALL_ACCOUNTS,
  limit = TRANSACTIONS_PAGE_SIZE
): Promise<Transaction[]> {
  const database = await getDatabase()
  const { clause, params } = accountFilterClause(accountFilter)
  const rows = await database.getAllAsync<TransactionRow>(
    `SELECT ${TRANSACTION_COLUMNS} FROM transactions WHERE deleted_at IS NULL AND state = ?${clause} ORDER BY occurred_at DESC LIMIT ?`,
    state,
    ...params,
    limit
  )

  return rows.map(rowToTransaction)
}

export async function listTransactionsFiltered(
  filter: TransactionFilter,
  limit = TRANSACTIONS_PAGE_SIZE
): Promise<Transaction[]> {
  const database = await getDatabase()
  const { clause, params } = buildTransactionFilter(filter)
  const rows = await database.getAllAsync<TransactionRow>(
    `SELECT ${TRANSACTION_COLUMNS} FROM transactions WHERE deleted_at IS NULL${clause} ORDER BY occurred_at DESC LIMIT ?`,
    ...params,
    limit
  )

  return rows.map(rowToTransaction)
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const database = await getDatabase()
  const row = await database.getFirstAsync<TransactionRow>(
    `SELECT ${TRANSACTION_COLUMNS} FROM transactions WHERE deleted_at IS NULL AND id = ?`,
    id
  )

  return row ? rowToTransaction(row) : null
}

export async function updateTransactionState(
  id: string,
  state: TransactionState
): Promise<void> {
  const database = await getDatabase()
  await database.runAsync(
    "UPDATE transactions SET state = ?, updated_at = ?, synced_at = NULL WHERE id = ?",
    state,
    Date.now(),
    id
  )
}

export async function updateTransaction(
  id: string,
  update: TransactionUpdate
): Promise<void> {
  const assignments: string[] = []
  const values: (number | string | null)[] = []

  for (const [key, column] of UPDATE_COLUMNS) {
    const value = update[key]

    if (value !== undefined) {
      assignments.push(`${column} = ?`)
      values.push(value)
    }
  }

  if (assignments.length === 0) {
    return
  }

  assignments.push("updated_at = ?", "synced_at = NULL")
  values.push(Date.now(), id)

  const database = await getDatabase()
  await database.runAsync(
    `UPDATE transactions SET ${assignments.join(", ")} WHERE id = ?`,
    ...values
  )
}

// Soft delete: the row is kept as a tombstone so the delete can sync and the
// remote copy is not resurrected on the next pull.
export async function deleteTransaction(id: string): Promise<void> {
  const database = await getDatabase()
  const now = Date.now()

  await database.runAsync(
    "UPDATE transactions SET deleted_at = ?, updated_at = ?, synced_at = NULL WHERE id = ?",
    now,
    now,
    id
  )
}
