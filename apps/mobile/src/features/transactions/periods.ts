import type { Currency, Transaction } from "./types"

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

export interface CurrencySummary {
  byCategory: CategorySummary[]
  currency: Currency
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
): CurrencySummary[] {
  const summaries = new Map<Currency, CurrencySummary>()

  for (const transaction of transactions) {
    let summary = summaries.get(transaction.currency)
    if (!summary) {
      summary = {
        byCategory: [],
        currency: transaction.currency,
        expense: 0,
        income: 0,
      }
      summaries.set(transaction.currency, summary)
    }

    if (transaction.kind === "income") {
      summary.income += transaction.amount
      continue
    }

    summary.expense += transaction.amount
    const existing = summary.byCategory.find(
      (entry) => entry.categoryId === transaction.categoryId
    )
    if (existing) {
      existing.total += transaction.amount
    } else {
      summary.byCategory.push({
        categoryId: transaction.categoryId,
        total: transaction.amount,
      })
    }
  }

  return [...summaries.values()].map((summary) => ({
    ...summary,
    byCategory: [...summary.byCategory].sort((a, b) => b.total - a.total),
  }))
}
