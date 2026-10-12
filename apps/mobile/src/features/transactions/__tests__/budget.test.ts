import { describe, expect, it } from "bun:test"

import {
  budgetProgress,
  budgetStatus,
  budgetSummary,
  WARNING_RATIO,
} from "../budget"
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

  it("computes remaining and status per category", () => {
    const progress = budgetProgress(
      [makeTransaction({ amount: 2000, categoryId: "food" })],
      categories,
      [{ amount: 1000, categoryId: "food", updatedAt: 0 }]
    )

    const food = progress.find((item) => item.category.id === "food")
    expect(food).toMatchObject({ remaining: -1000, status: "exceeded" })

    const transport = progress.find((item) => item.category.id === "transport")
    expect(transport).toMatchObject({ remaining: 0, status: "unset" })
  })
})

describe("budgetStatus", () => {
  it("is unset without a limit", () => {
    expect(budgetStatus(0, 500)).toBe("unset")
  })

  it("is on_track below the warning ratio", () => {
    expect(budgetStatus(1000, 799)).toBe("on_track")
  })

  it("warns at and above the threshold", () => {
    expect(budgetStatus(1000, 800)).toBe("warning")
    expect(budgetStatus(1000, 1000)).toBe("warning")
    expect(WARNING_RATIO).toBe(0.8)
  })

  it("is exceeded over the limit", () => {
    expect(budgetStatus(1000, 1001)).toBe("exceeded")
  })
})

describe("budgetSummary", () => {
  it("totals only the categories with a limit", () => {
    const progress = budgetProgress(
      [
        makeTransaction({ amount: 2000, categoryId: "food" }),
        makeTransaction({ amount: 500, categoryId: "transport" }),
      ],
      categories,
      [{ amount: 1000, categoryId: "food", updatedAt: 0 }]
    )

    expect(budgetSummary(progress)).toEqual({
      budgeted: 1000,
      remaining: -1000,
      spent: 2000,
      status: "exceeded",
    })
  })

  it("is unset with no budgets", () => {
    expect(budgetSummary(budgetProgress([], categories, []))).toEqual({
      budgeted: 0,
      remaining: 0,
      spent: 0,
      status: "unset",
    })
  })
})
