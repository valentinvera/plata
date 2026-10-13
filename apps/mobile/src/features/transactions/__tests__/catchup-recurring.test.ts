import { describe, expect, it } from "bun:test"

import {
  missingRange,
  suggestRecurringTransactions,
} from "../catchup-recurring"
import type { Transaction } from "../types"

const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2026, 0, 1, 9, 0, 0)

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    accountId: null,
    amount: 5000,
    categoryId: "services",
    confidence: null,
    createdAt: 0,
    currency: "ARS",
    id: "tx",
    kind: "expense",
    merchant: "Netflix",
    note: null,
    occurredAt: START,
    rawRef: null,
    source: "manual",
    state: "confirmed",
    updatedAt: 0,
    ...overrides,
  }
}

const MONTHLY = [
  makeTransaction({ id: "a", occurredAt: START }),
  makeTransaction({ id: "b", occurredAt: START + 30 * DAY }),
  makeTransaction({ id: "c", occurredAt: START + 60 * DAY }),
]

describe("missingRange", () => {
  it("starts after the latest transaction", () => {
    const now = START + 120 * DAY
    expect(missingRange(MONTHLY, now)).toEqual({
      end: now,
      start: START + 60 * DAY,
    })
  })

  it("falls back to the last 30 days without history", () => {
    const now = START + 120 * DAY
    expect(missingRange([], now)).toEqual({
      end: now,
      start: now - 30 * DAY,
    })
  })
})

describe("suggestRecurringTransactions", () => {
  it("projects a recurring payment into the missing period", () => {
    const suggestions = suggestRecurringTransactions(MONTHLY, START + 120 * DAY)

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      amount: 5000,
      categoryId: "services",
      merchant: "Netflix",
      occurredAt: START + 90 * DAY,
    })
  })

  it("skips a date that already has a matching transaction", () => {
    const recorded = [
      ...MONTHLY,
      makeTransaction({ id: "d", occurredAt: START + 90 * DAY }),
    ]

    expect(suggestRecurringTransactions(recorded, START + 120 * DAY)).toEqual(
      []
    )
  })

  it("returns nothing when caught up", () => {
    expect(
      suggestRecurringTransactions(MONTHLY, START + 60 * DAY + DAY)
    ).toEqual([])
  })
})
