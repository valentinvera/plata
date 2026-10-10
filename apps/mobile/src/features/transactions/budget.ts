import type { Category, Currency, Transaction } from "./types"

export interface Budget {
  amount: number
  categoryId: string
  updatedAt: number
}

export interface BudgetProgress {
  budget: Budget
  category: Category
  ratio: number
  spent: number
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
      spent,
    }
  })
}
