import { describe, expect, it } from "bun:test"

import { categoryChanges, comparePeriods, largestExpenses } from "../insights"
import type { Transaction } from "../types"

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

describe("comparePeriods", () => {
  const previous = [
    makeTransaction({ amount: 10_000, categoryId: "groceries" }),
    makeTransaction({ amount: 5000, kind: "income" }),
  ]
  const current = [
    makeTransaction({ amount: 15_000, categoryId: "groceries" }),
    makeTransaction({ amount: 8000, kind: "income" }),
  ]

  it("reports expense and income movement", () => {
    expect(comparePeriods(current, previous)).toEqual([
      {
        currency: "ARS",
        currentExpense: 15_000,
        expenseChangeRatio: 0.5,
        expenseDelta: 5000,
        incomeDelta: 3000,
        previousExpense: 10_000,
      },
    ])
  })

  it("returns a null ratio when the previous period had no expense", () => {
    expect(comparePeriods(current, [])[0]?.expenseChangeRatio).toBeNull()
  })

  it("keeps currencies apart", () => {
    const usd = [makeTransaction({ amount: 2000, currency: "USD" })]

    expect(comparePeriods(usd, [])).toEqual([
      {
        currency: "USD",
        currentExpense: 2000,
        expenseChangeRatio: null,
        expenseDelta: 2000,
        incomeDelta: 0,
        previousExpense: 0,
      },
    ])
  })
})

describe("categoryChanges", () => {
  it("computes per-category deltas, most changed first", () => {
    const previous = [
      makeTransaction({ amount: 10_000, categoryId: "groceries" }),
      makeTransaction({ amount: 4000, categoryId: "food" }),
    ]
    const current = [
      makeTransaction({ amount: 6000, categoryId: "groceries" }),
      makeTransaction({ amount: 7000, categoryId: "food" }),
    ]

    expect(categoryChanges(current, previous, "ARS")).toEqual([
      {
        categoryId: "groceries",
        current: 6000,
        delta: -4000,
        previous: 10_000,
      },
      { categoryId: "food", current: 7000, delta: 3000, previous: 4000 },
    ])
  })

  it("includes categories present in only one period", () => {
    const current = [makeTransaction({ amount: 2000, categoryId: "health" })]

    expect(categoryChanges(current, [], "ARS")).toEqual([
      { categoryId: "health", current: 2000, delta: 2000, previous: 0 },
    ])
  })

  it("ignores transactions in another currency", () => {
    const current = [
      makeTransaction({ amount: 2000, categoryId: "health", currency: "USD" }),
    ]

    expect(categoryChanges(current, [], "ARS")).toEqual([])
  })
})

describe("largestExpenses", () => {
  const transactions = [
    makeTransaction({ amount: 1000, id: "a" }),
    makeTransaction({ amount: 9000, id: "b" }),
    makeTransaction({ amount: 5000, id: "c" }),
    makeTransaction({ amount: 99_000, id: "d", kind: "income" }),
  ]

  it("returns the biggest expenses and ignores income", () => {
    expect(largestExpenses(transactions, "ARS").map((item) => item.id)).toEqual(
      ["b", "c", "a"]
    )
  })

  it("honors the limit", () => {
    expect(
      largestExpenses(transactions, "ARS", 1).map((item) => item.id)
    ).toEqual(["b"])
  })

  it("ranks within a single currency", () => {
    const mixed = [
      makeTransaction({ amount: 10_000, currency: "ARS", id: "ars" }),
      makeTransaction({ amount: 100, currency: "USD", id: "usd" }),
    ]

    expect(largestExpenses(mixed, "USD").map((item) => item.id)).toEqual([
      "usd",
    ])
  })
})
