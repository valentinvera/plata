import { describe, expect, it } from "bun:test"

import {
  isWithinRange,
  monthRange,
  startOfDay,
  summarize,
  weekRange,
} from "../periods"
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

describe("monthRange", () => {
  it("starts on the 1st at 00:00 and ends the following month", () => {
    const range = monthRange(new Date(2026, 7, 15, 10).getTime())
    const start = new Date(range.start)
    const end = new Date(range.end)

    expect(start.getDate()).toBe(1)
    expect(start.getHours()).toBe(0)
    expect(end.getMonth()).toBe((start.getMonth() + 1) % 12)
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
  it("totals per currency and groups expenses by category", () => {
    const summaries = summarize([
      makeTransaction({ amount: 1000, categoryId: "food", currency: "ARS" }),
      makeTransaction({ amount: 500, categoryId: "food", currency: "ARS" }),
      makeTransaction({
        amount: 300,
        categoryId: "transport",
        currency: "ARS",
      }),
      makeTransaction({
        amount: 9000,
        categoryId: "income",
        currency: "ARS",
        kind: "income",
      }),
      makeTransaction({
        amount: 2000,
        categoryId: "shopping",
        currency: "USD",
      }),
    ])

    expect(summaries).toHaveLength(2)

    expect(summaries.find((item) => item.currency === "ARS")).toEqual({
      byCategory: [
        { categoryId: "food", total: 1500 },
        { categoryId: "transport", total: 300 },
      ],
      currency: "ARS",
      expense: 1800,
      income: 9000,
    })

    expect(summaries.find((item) => item.currency === "USD")).toEqual({
      byCategory: [{ categoryId: "shopping", total: 2000 }],
      currency: "USD",
      expense: 2000,
      income: 0,
    })
  })
})
