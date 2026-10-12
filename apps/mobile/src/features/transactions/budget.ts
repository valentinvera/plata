import type { Category, Currency, Transaction } from "./types"

export interface Budget {
  amount: number
  categoryId: string
  updatedAt: number
}

export type BudgetStatus = "unset" | "on_track" | "warning" | "exceeded"

export interface BudgetProgress {
  budget: Budget
  category: Category
  ratio: number
  remaining: number
  spent: number
  status: BudgetStatus
}

export interface BudgetSummary {
  budgeted: number
  remaining: number
  spent: number
  status: BudgetStatus
}

// A budget is "warning" once this share of it has been spent.
export const WARNING_RATIO = 0.8

export function budgetStatus(amount: number, spent: number): BudgetStatus {
  if (amount <= 0) {
    return "unset"
  }

  if (spent > amount) {
    return "exceeded"
  }

  return spent >= amount * WARNING_RATIO ? "warning" : "on_track"
}

export function budgetProgress(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  budgets: readonly Budget[],
  currency: Currency = "ARS"
): BudgetProgress[] {
  const budgetByCategory = new Map(
    budgets.map((budget) => [budget.categoryId, budget])
  )
  const spentByCategory = new Map<string, number>()

  for (const transaction of transactions) {
    if (transaction.kind !== "expense" || transaction.currency !== currency) {
      continue
    }
    spentByCategory.set(
      transaction.categoryId,
      (spentByCategory.get(transaction.categoryId) ?? 0) + transaction.amount
    )
  }

  return categories.map((category) => {
    const budget = budgetByCategory.get(category.id) ?? {
      amount: 0,
      categoryId: category.id,
      updatedAt: 0,
    }
    const spent = spentByCategory.get(category.id) ?? 0

    return {
      budget,
      category,
      ratio: budget.amount > 0 ? spent / budget.amount : 0,
      remaining: budget.amount - spent,
      spent,
      status: budgetStatus(budget.amount, spent),
    }
  })
}

// Totals across the categories that actually have a limit set.
export function budgetSummary(
  progress: readonly BudgetProgress[]
): BudgetSummary {
  let budgeted = 0
  let spent = 0

  for (const item of progress) {
    if (item.budget.amount <= 0) {
      continue
    }

    budgeted += item.budget.amount
    spent += item.spent
  }

  return {
    budgeted,
    remaining: budgeted - spent,
    spent,
    status: budgetStatus(budgeted, spent),
  }
}
