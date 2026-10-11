import { summarize } from "./periods"
import type { Currency, Transaction } from "./types"

export interface PeriodComparison {
  currency: Currency
  currentExpense: number
  expenseChangeRatio: number | null
  expenseDelta: number
  incomeDelta: number
  previousExpense: number
}

export interface CategoryChange {
  categoryId: string
  current: number
  delta: number
  previous: number
}

const DEFAULT_TOP_EXPENSES = 3

function changeRatio(current: number, previous: number): number | null {
  return previous === 0 ? null : (current - previous) / previous
}

function expenseTotals(
  transactions: readonly Transaction[],
  currency: Currency
): Map<string, number> {
  const totals = new Map<string, number>()

  for (const transaction of transactions) {
    if (transaction.kind !== "expense" || transaction.currency !== currency) {
      continue
    }

    totals.set(
      transaction.categoryId,
      (totals.get(transaction.categoryId) ?? 0) + transaction.amount
    )
  }

  return totals
}

// Compares expense/income between two periods, one row per currency so ARS and
// USD totals are never mixed.
export function comparePeriods(
  current: readonly Transaction[],
  previous: readonly Transaction[]
): PeriodComparison[] {
  const currentByCurrency = new Map(
    summarize(current).map((summary) => [summary.currency, summary])
  )
  const previousByCurrency = new Map(
    summarize(previous).map((summary) => [summary.currency, summary])
  )
  const currencies = new Set([
    ...currentByCurrency.keys(),
    ...previousByCurrency.keys(),
  ])

  return [...currencies].map((currency) => {
    const currentSummary = currentByCurrency.get(currency)
    const previousSummary = previousByCurrency.get(currency)
    const currentExpense = currentSummary?.expense ?? 0
    const previousExpense = previousSummary?.expense ?? 0

    return {
      currency,
      currentExpense,
      expenseChangeRatio: changeRatio(currentExpense, previousExpense),
      expenseDelta: currentExpense - previousExpense,
      incomeDelta:
        (currentSummary?.income ?? 0) - (previousSummary?.income ?? 0),
      previousExpense,
    }
  })
}

// Per-category expense movement between two periods for one currency, most
// changed first.
export function categoryChanges(
  current: readonly Transaction[],
  previous: readonly Transaction[],
  currency: Currency
): CategoryChange[] {
  const currentTotals = expenseTotals(current, currency)
  const previousTotals = expenseTotals(previous, currency)
  const categoryIds = new Set([
    ...currentTotals.keys(),
    ...previousTotals.keys(),
  ])

  return [...categoryIds]
    .map((categoryId) => {
      const currentTotal = currentTotals.get(categoryId) ?? 0
      const previousTotal = previousTotals.get(categoryId) ?? 0

      return {
        categoryId,
        current: currentTotal,
        delta: currentTotal - previousTotal,
        previous: previousTotal,
      }
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

export function largestExpenses(
  transactions: readonly Transaction[],
  currency: Currency,
  limit = DEFAULT_TOP_EXPENSES
): Transaction[] {
  return [...transactions]
    .filter(
      (transaction) =>
        transaction.kind === "expense" && transaction.currency === currency
    )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}
