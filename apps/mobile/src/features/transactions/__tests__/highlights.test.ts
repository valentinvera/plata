import { describe, expect, it } from "bun:test"

import { computeHighlights } from "../highlights"
import type { Transaction } from "../types"

const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2026, 0, 1, 9, 0, 0)

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    accountId: null,
    amount: 5000,
    categoryId: "food",
    confidence: null,
    createdAt: 0,
    currency: "ARS",
    id: "tx",
    kind: "expense",
    merchant: "Carrefour",
    note: null,
    occurredAt: START,
    rawRef: null,
    source: "manual",
    state: "confirmed",
    updatedAt: 0,
    ...overrides,
  }
}

describe("computeHighlights", () => {
  it("summarizes the month, top category, recurring and duplicates", () => {
    const current = [
      makeTransaction({ amount: 2000, categoryId: "food", id: "a" }),
      makeTransaction({ amount: 1000, categoryId: "transport", id: "b" }),
    ]
    const previous = [makeTransaction({ amount: 1000, categoryId: "food" })]

    const highlights = computeHighlights({
      currency: "ARS",
      current,
      previous,
      recent: current,
    })

    expect(highlights.monthExpense).toBe(3000)
    expect(highlights.monthExpenseChangeRatio).toBe(2)
    expect(highlights.topCategory).toEqual({ amount: 2000, categoryId: "food" })
  })

  it("ignores other currencies and income", () => {
    const current = [
      makeTransaction({ amount: 2000, currency: "ARS", id: "a" }),
      makeTransaction({ amount: 999, currency: "USD", id: "b" }),
      makeTransaction({ amount: 5000, id: "c", kind: "income" }),
    ]

    const highlights = computeHighlights({
      currency: "ARS",
      current,
      previous: [],
      recent: current,
    })

    expect(highlights.monthExpense).toBe(2000)
    expect(highlights.monthExpenseChangeRatio).toBeNull()
    expect(highlights.topCategory).toEqual({ amount: 2000, categoryId: "food" })
  })

  it("counts recurring payments and duplicate groups", () => {
    const recurring = [
      makeTransaction({ id: "g1", merchant: "Gym", occurredAt: START }),
      makeTransaction({
        id: "g2",
        merchant: "Gym",
        occurredAt: START + 30 * DAY,
      }),
      makeTransaction({
        id: "g3",
        merchant: "Gym",
        occurredAt: START + 60 * DAY,
      }),
    ]
    const duplicates = [
      makeTransaction({ id: "d1", occurredAt: START }),
      makeTransaction({ id: "d2", occurredAt: START + 60_000 }),
    ]

    const highlights = computeHighlights({
      currency: "ARS",
      current: [],
      previous: [],
      recent: [...recurring, ...duplicates],
    })

    expect(highlights.recurring).toBe(1)
    expect(highlights.duplicates).toBeGreaterThanOrEqual(1)
  })
})
