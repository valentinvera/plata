export type Currency = "ARS" | "USD"

export type TransactionKind = "expense" | "income"

export type TransactionSource = "manual" | "notification" | "screenshot"

export type TransactionState = "confirmed" | "suggested"

export interface Category {
  id: string
  keywords: readonly string[]
  name: string
}

export interface CategorizationResult {
  categoryId: string
  confidence: number
}

export interface ParsedTransaction {
  amount: number | null
  currency: Currency
  kind: TransactionKind
  merchant: string | null
  occurredAt: number | null
}

export interface Transaction {
  amount: number
  categoryId: string
  confidence: number | null
  createdAt: number
  currency: Currency
  id: string
  kind: TransactionKind
  merchant: string | null
  note: string | null
  occurredAt: number
  rawRef: string | null
  source: TransactionSource
  state: TransactionState
  updatedAt: number
}

export interface NewTransaction {
  amount: number
  categoryId: string
  confidence: number | null
  currency: Currency
  id?: string
  kind: TransactionKind
  merchant: string | null
  note: string | null
  occurredAt: number
  rawRef: string | null
  source: TransactionSource
  state: TransactionState
}
