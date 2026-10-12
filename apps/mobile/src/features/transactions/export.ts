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

const CSV_SPECIALS = /[",\n\r]/
const CSV_QUOTE = /"/g

function escapeCsv(value: string): string {
  return CSV_SPECIALS.test(value)
    ? `"${value.replace(CSV_QUOTE, '""')}"`
    : value
}

function amountText(cents: number): string {
  return (cents / 100).toFixed(2)
}

function categoryName(
  categoryId: string,
  categories: readonly Category[]
): string {
  return (
    categories.find((category) => category.id === categoryId)?.name ??
    categoryId
  )
}

export function transactionsToCsv(
  transactions: readonly Transaction[],
  categories: readonly Category[]
): string {
  const rows = transactions.map((transaction) => [
    new Date(transaction.occurredAt).toISOString(),
    amountText(transaction.amount),
    transaction.currency,
    transaction.kind,
    categoryName(transaction.categoryId, categories),
    transaction.merchant ?? "",
    transaction.note ?? "",
    transaction.accountId ?? "",
    transaction.source,
    transaction.state,
  ])

  return [CSV_HEADER, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n")
}

export function transactionsToJson(
  transactions: readonly Transaction[]
): string {
  return JSON.stringify({ transactions, version: 1 }, null, 2)
}

export function buildExport(
  format: ExportFormat,
  transactions: readonly Transaction[],
  categories: readonly Category[]
): ExportBundle {
  if (format === "json") {
    return {
      content: transactionsToJson(transactions),
      filename: "plata-transactions.json",
      mimeType: "application/json",
    }
  }

  return {
    content: transactionsToCsv(transactions, categories),
    filename: "plata-transactions.csv",
    mimeType: "text/csv",
  }
}
