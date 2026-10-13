import { findDuplicateGroups } from "./duplicates"
import { comparePeriods } from "./insights"
import { detectRecurring } from "./recurring"
import type { Currency, Transaction } from "./types"

export interface CategoryHighlight {
  amount: number
  categoryId: string
}

export interface HomeHighlights {
  duplicates: number
  monthExpense: number
  monthExpenseChangeRatio: number | null
  recurring: number
  topCategory: CategoryHighlight | null
}

// Compact summary for the home screen: this month's spend and its change, the
// top category, and how many recurring payments / duplicate groups were found.
export function computeHighlights(input: {
  currency: Currency
  current: readonly Transaction[]
  previous: readonly Transaction[]
  recent: readonly Transaction[]
}): HomeHighlights {
  const comparison = comparePeriods(input.current, input.previous).find(
    (entry) => entry.currency === input.currency
  )
  const totals = new Map<string, number>()

  for (const transaction of input.current) {
    if (
      transaction.kind !== "expense" ||
      transaction.currency !== input.currency
    ) {
      continue
    }

    totals.set(
      transaction.categoryId,
      (totals.get(transaction.categoryId) ?? 0) + transaction.amount
    )
  }

  let topCategory: CategoryHighlight | null = null

  for (const [categoryId, amount] of totals) {
    if (!topCategory || amount > topCategory.amount) {
      topCategory = { amount, categoryId }
    }
  }

  return {
    duplicates: findDuplicateGroups(input.recent).length,
    monthExpense: comparison?.currentExpense ?? 0,
    monthExpenseChangeRatio: comparison?.expenseChangeRatio ?? null,
    recurring: detectRecurring(input.recent).length,
    topCategory,
  }
}
