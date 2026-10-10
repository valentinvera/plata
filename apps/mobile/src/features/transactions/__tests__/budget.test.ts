import { describe, expect, it } from "bun:test"

import { budgetProgress } from "../budget"
import type { Category, Transaction } from "../types"

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    accountId: null,
    amount: 1000,
    categoryId: "food",
    confidence: null,
    createdAt: 0,
    currency: "ARS",
    id: "tx",
    kind: "expense",
    merchant: null,
    note: null,
    occurredAt: 0,
    rawRef: null,
    source: "manual",
    state: "confirmed",
    updatedAt: 0,
    ...overrides,
  }
}

const categories: Category[] = [
  { id: "food", keywords: [], name: "Comida" },
  { id: "transport", keywords: [], name: "Transporte" },
]

describe("budgetProgress", () => {
  it("computes spent and ratio per category", () => {
    const progress = budgetProgress(
      [
        makeTransaction({ amount: 1500, categoryId: "food" }),
        makeTransaction({ amount: 500, categoryId: "food" }),
        makeTransaction({ amount: 9000, categoryId: "income", kind: "income" }),
      ],
      categories,
      [{ amount: 1000, categoryId: "food", updatedAt: 0 }]
    )

    expect(progress).toHaveLength(2)

    const food = progress.find((item) => item.category.id === "food")
    expect(food?.budget.amount).toBe(1000)
    expect(food).toMatchObject({ ratio: 2, spent: 2000 })

    const transport = progress.find((item) => item.category.id === "transport")
    expect(transport?.budget.amount).toBe(0)
    expect(transport).toMatchObject({ ratio: 0, spent: 0 })
  })

  it("ignores expenses in another currency", () => {
    const progress = budgetProgress(
      [
        makeTransaction({ amount: 1500, categoryId: "food", currency: "ARS" }),
        makeTransaction({ amount: 999, categoryId: "food", currency: "USD" }),
      ],
      categories,
      [{ amount: 1000, categoryId: "food", updatedAt: 0 }]
    )

    const food = progress.find((item) => item.category.id === "food")
    expect(food).toMatchObject({ ratio: 1.5, spent: 1500 })
  })
})
