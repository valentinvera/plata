import type { Transaction } from "./types"

export const DAYS_PER_WEEK = 7

export interface DateRange {
  /** Exclusive upper bound (ms). */
  end: number
  /** Inclusive lower bound (ms). */
  start: number
}

export interface DayGroup {
  day: number
  items: Transaction[]
}

export interface CategorySummary {
  categoryId: string
  total: number
}

export interface TransactionSummary {
  byCategory: CategorySummary[]
  expense: number
  income: number
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function weekRange(timestamp: number): DateRange {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  const daysSinceMonday = (date.getDay() + 6) % DAYS_PER_WEEK
  date.setDate(date.getDate() - daysSinceMonday)

  const start = date.getTime()
  const end = new Date(date)
  end.setDate(end.getDate() + DAYS_PER_WEEK)

  return { end: end.getTime(), start }
}

export function isWithinRange(
  transaction: Transaction,
  range: DateRange
): boolean {
  return (
    transaction.occurredAt >= range.start && transaction.occurredAt < range.end
  )
}

export function groupByDay(transactions: readonly Transaction[]): DayGroup[] {
  const groups = new Map<number, Transaction[]>()

  for (const transaction of transactions) {
    const day = startOfDay(transaction.occurredAt)
    const bucket = groups.get(day)
    if (bucket) {
      bucket.push(transaction)
    } else {
      groups.set(day, [transaction])
    }
  }

  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([day, items]) => ({ day, items }))
}

export function summarize(
  transactions: readonly Transaction[]
): TransactionSummary {
  let expense = 0
  let income = 0
  const byCategoryTotals = new Map<string, number>()

  for (const transaction of transactions) {
    if (transaction.kind === "income") {
      income += transaction.amount
      continue
    }

    expense += transaction.amount
    byCategoryTotals.set(
      transaction.categoryId,
      (byCategoryTotals.get(transaction.categoryId) ?? 0) + transaction.amount
    )
  }

  const byCategory = [...byCategoryTotals.entries()]
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total)

  return { byCategory, expense, income }
}
