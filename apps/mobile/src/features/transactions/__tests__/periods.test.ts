import { describe, expect, it } from "bun:test"

import { isWithinRange, startOfDay, summarize, weekRange } from "../periods"
import type { Transaction } from "../types"

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
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

describe("startOfDay", () => {
  it("zeroes the time component", () => {
    const day = startOfDay(new Date(2026, 7, 5, 15, 30).getTime())
    expect(new Date(day).getHours()).toBe(0)
    expect(new Date(day).getMinutes()).toBe(0)
  })
})

describe("weekRange", () => {
  it("starts on Monday at 00:00 and ends the following Monday", () => {
    const range = weekRange(new Date(2026, 7, 5, 15).getTime())
    const start = new Date(range.start)
    const end = new Date(range.end)

    expect(start.getDay()).toBe(1)
    expect(start.getHours()).toBe(0)
    expect(end.getDay()).toBe(1)
  })
})

describe("isWithinRange", () => {
  it("includes the start and excludes the end", () => {
    const range = { end: 200, start: 100 }

    expect(isWithinRange(makeTransaction({ occurredAt: 100 }), range)).toBe(
      true
    )
    expect(isWithinRange(makeTransaction({ occurredAt: 199 }), range)).toBe(
      true
    )
    expect(isWithinRange(makeTransaction({ occurredAt: 200 }), range)).toBe(
      false
    )
  })
})

describe("summarize", () => {
  it("totals expenses and income and groups expenses by category", () => {
    const summary = summarize([
      makeTransaction({ amount: 1000, categoryId: "food", kind: "expense" }),
      makeTransaction({ amount: 500, categoryId: "food", kind: "expense" }),
      makeTransaction({
        amount: 300,
        categoryId: "transport",
        kind: "expense",
      }),
      makeTransaction({ amount: 9000, categoryId: "income", kind: "income" }),
    ])

    expect(summary.expense).toBe(1800)
    expect(summary.income).toBe(9000)
    expect(summary.byCategory).toEqual([
      { categoryId: "food", total: 1500 },
      { categoryId: "transport", total: 300 },
    ])
  })
})
