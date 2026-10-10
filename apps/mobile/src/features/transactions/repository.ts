import type { SQLiteDatabase } from "expo-sqlite"

import { getDatabase } from "./db"
import { createId } from "./id"
import { rowToTransaction, type TransactionRow } from "./row"
import type { NewTransaction, Transaction, TransactionState } from "./types"

const COLUMNS =
  "id, amount, category_id, confidence, created_at, currency, kind, merchant, note, occurred_at, raw_ref, source, state, updated_at"

const INSERT_SQL = `INSERT INTO transactions (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

export const TRANSACTIONS_PAGE_SIZE = 100

function buildTransaction(input: NewTransaction, now: number): Transaction {
  return {
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
    transaction.updatedAt
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
    `SELECT ${COLUMNS} FROM transactions ORDER BY occurred_at DESC LIMIT ?`,
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
    `SELECT ${COLUMNS} FROM transactions WHERE occurred_at >= ? AND occurred_at < ? ORDER BY occurred_at DESC`,
    start,
    end
  )

  return rows.map(rowToTransaction)
}

export async function listTransactionsByState(
  state: TransactionState,
  limit = TRANSACTIONS_PAGE_SIZE
): Promise<Transaction[]> {
  const database = await getDatabase()
  const rows = await database.getAllAsync<TransactionRow>(
    `SELECT ${COLUMNS} FROM transactions WHERE state = ? ORDER BY occurred_at DESC LIMIT ?`,
    state,
    limit
  )

  return rows.map(rowToTransaction)
}

export async function updateTransactionState(
  id: string,
  state: TransactionState
): Promise<void> {
  const database = await getDatabase()
  await database.runAsync(
    "UPDATE transactions SET state = ?, updated_at = ? WHERE id = ?",
    state,
    Date.now(),
    id
  )
}

export async function deleteTransaction(id: string): Promise<void> {
  const database = await getDatabase()
  await database.runAsync("DELETE FROM transactions WHERE id = ?", id)
}
