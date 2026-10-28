import type { Account } from "./accounts"
import { centsToDecimal } from "./amount-text"
import type { Category, Transaction } from "./types"

export type ExportFormat = "csv" | "json"

export interface ExportBundle {
  content: string
  filename: string
  mimeType: string
}

const CSV_HEADER = [
  "date",
  "amount",
  "currency",
  "kind",
  "category",
  "merchant",
  "note",
  "account",
  "source",
  "state",
] as const

// Spreadsheets treat cells starting with these as formulas, so they must be
// neutralized even when quoted (CSV injection).
const FORMULA_PREFIX = /^[=+\-@\t\r]/
const CSV_SPECIALS = /[",\n\r]/
const CSV_QUOTE = /"/g

function escapeCsv(value: string): string {
  const neutralized = FORMULA_PREFIX.test(value) ? `'${value}` : value

  return CSV_SPECIALS.test(neutralized)
    ? `"${neutralized.replace(CSV_QUOTE, '""')}"`
    : neutralized
}

function lookupName(
  id: string | null,
  entries: readonly { id: string; name: string }[]
): string {
  if (!id) {
    return ""
  }

  return entries.find((entry) => entry.id === id)?.name ?? id
}

export function transactionsToCsv(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  accounts: readonly Account[]
): string {
  const rows = transactions.map((transaction) => [
    new Date(transaction.occurredAt).toISOString(),
    centsToDecimal(transaction.amount),
    transaction.currency,
    transaction.kind,
    lookupName(transaction.categoryId, categories),
    transaction.merchant ?? "",
    transaction.note ?? "",
    lookupName(transaction.accountId, accounts),
    transaction.source,
    transaction.state,
  ])

  return [CSV_HEADER, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n")
}

export function transactionsToJson(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  categories: readonly Category[]
): string {
  return JSON.stringify(
    { accounts, categories, transactions, version: 1 },
    null,
    2
  )
}

export function buildExport(
  format: ExportFormat,
  transactions: readonly Transaction[],
  categories: readonly Category[],
  accounts: readonly Account[]
): ExportBundle {
  if (format === "json") {
    return {
      content: transactionsToJson(transactions, accounts, categories),
      filename: "plata-transactions.json",
      mimeType: "application/json",
    }
  }

  return {
    content: transactionsToCsv(transactions, categories, accounts),
    filename: "plata-transactions.csv",
    mimeType: "text/csv",
  }
}
