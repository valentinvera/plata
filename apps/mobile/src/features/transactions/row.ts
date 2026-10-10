import type {
  Currency,
  Transaction,
  TransactionKind,
  TransactionSource,
  TransactionState,
} from "./types"

export interface TransactionRow {
  amount: number
  category_id: string
  confidence: number | null
  created_at: number
  currency: string
  id: string
  kind: string
  merchant: string | null
  note: string | null
  occurred_at: number
  raw_ref: string | null
  source: string
  state: string
  updated_at: number
}

export function rowToTransaction(row: TransactionRow): Transaction {
  return {
    amount: row.amount,
    categoryId: row.category_id,
    confidence: row.confidence,
    createdAt: row.created_at,
    currency: row.currency as Currency,
    id: row.id,
    kind: row.kind as TransactionKind,
    merchant: row.merchant,
    note: row.note,
    occurredAt: row.occurred_at,
    rawRef: row.raw_ref,
    source: row.source as TransactionSource,
    state: row.state as TransactionState,
    updatedAt: row.updated_at,
  }
}
