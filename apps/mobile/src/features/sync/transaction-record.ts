import type { Transaction } from "../transactions/types"

const CURRENCIES: readonly string[] = ["ARS", "USD"]
const KINDS: readonly string[] = ["expense", "income"]
const SOURCES: readonly string[] = ["manual", "notification", "screenshot"]
const STATES: readonly string[] = ["confirmed", "suggested"]

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

function isEnum(value: unknown, allowed: readonly string[]): value is string {
  return typeof value === "string" && allowed.includes(value)
}

function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const record = value as Record<string, unknown>

  return (
    isNullableString(record.accountId) &&
    isNumber(record.amount) &&
    typeof record.categoryId === "string" &&
    isNullableNumber(record.confidence) &&
    isNumber(record.createdAt) &&
    isEnum(record.currency, CURRENCIES) &&
    typeof record.id === "string" &&
    isEnum(record.kind, KINDS) &&
    isNullableString(record.merchant) &&
    isNullableString(record.note) &&
    isNumber(record.occurredAt) &&
    isNullableString(record.rawRef) &&
    isEnum(record.source, SOURCES) &&
    isEnum(record.state, STATES) &&
    isNumber(record.updatedAt)
  )
}

export function encodeTransactionPayload(transaction: Transaction): string {
  return JSON.stringify(transaction)
}

export function decodeTransactionPayload(payload: string): Transaction | null {
  try {
    const value: unknown = JSON.parse(payload)

    return isTransaction(value) ? value : null
  } catch {
    return null
  }
}
