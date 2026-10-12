import type { SQLiteDatabase } from "expo-sqlite"

import { getAppMeta, setAppMeta } from "../transactions/app-meta-repository"
import { getDatabase } from "../transactions/db"
import { TRANSACTION_COLUMNS } from "../transactions/repository"
import { rowToTransaction, type TransactionRow } from "../transactions/row"
import {
  decodeTransactionPayload,
  encodeTransactionPayload,
} from "./transaction-record"
import type { SyncRecord, SyncStore, SyncVersion } from "./types"

const CURSOR_KEY = "sync_cursor"
const SELECT_COLUMNS = `${TRANSACTION_COLUMNS}, deleted_at, synced_at`
// A row is pending upload when it changed after the last acknowledged sync.
const DIRTY_WHERE = "synced_at IS NULL OR synced_at < updated_at"

const UPSERT_SQL = `INSERT OR REPLACE INTO transactions (${SELECT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

interface SyncRow extends TransactionRow {
  deleted_at: number | null
  synced_at: number | null
}

function toRecord(row: SyncRow): SyncRecord {
  return {
    deletedAt: row.deleted_at,
    id: row.id,
    payload: encodeTransactionPayload(rowToTransaction(row)),
    updatedAt: row.updated_at,
  }
}

async function listDirty(database: SQLiteDatabase): Promise<SyncRecord[]> {
  const rows = await database.getAllAsync<SyncRow>(
    `SELECT ${SELECT_COLUMNS} FROM transactions WHERE ${DIRTY_WHERE} ORDER BY updated_at`
  )

  return rows.map(toRecord)
}

async function getRecord(
  database: SQLiteDatabase,
  id: string
): Promise<SyncRecord | null> {
  const row = await database.getFirstAsync<SyncRow>(
    `SELECT ${SELECT_COLUMNS} FROM transactions WHERE id = ?`,
    id
  )

  return row ? toRecord(row) : null
}

async function markSynced(
  database: SQLiteDatabase,
  versions: readonly SyncVersion[]
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await Promise.all(
      versions.map((version) =>
        database.runAsync(
          "UPDATE transactions SET synced_at = ? WHERE id = ? AND updated_at = ?",
          version.updatedAt,
          version.id,
          version.updatedAt
        )
      )
    )
  })
}

async function applyRemote(
  database: SQLiteDatabase,
  record: SyncRecord
): Promise<void> {
  if (record.deletedAt !== null) {
    await database.runAsync(
      "UPDATE transactions SET deleted_at = ?, updated_at = ?, synced_at = ? WHERE id = ?",
      record.deletedAt,
      record.updatedAt,
      record.updatedAt,
      record.id
    )

    return
  }

  const transaction = decodeTransactionPayload(record.payload)

  if (!transaction) {
    throw new Error(`Invalid transaction payload for ${record.id}`)
  }

  await database.runAsync(
    UPSERT_SQL,
    record.id,
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
    record.updatedAt,
    transaction.accountId,
    null,
    record.updatedAt
  )
}

export function createTransactionSyncStore(): SyncStore {
  return {
    applyRemote: async (record) => applyRemote(await getDatabase(), record),
    getCursor: async () => {
      const value = await getAppMeta(CURSOR_KEY)

      return value && value.length > 0 ? value : null
    },
    getRecord: async (id) => getRecord(await getDatabase(), id),
    listDirty: async () => listDirty(await getDatabase()),
    markSynced: async (versions) => markSynced(await getDatabase(), versions),
    setCursor: (cursor) => setAppMeta(CURSOR_KEY, cursor ?? ""),
  }
}
