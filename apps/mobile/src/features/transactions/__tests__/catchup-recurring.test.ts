import { describe, expect, it } from "bun:test"

import {
  missingRange,
  suggestRecurringTransactions,
} from "../catchup-recurring"
import type { Transaction } from "../types"

const DAY = 24 * 60 * 60 * 1000
const JAN_15 = new Date(2026, 0, 15, 9, 0, 0).getTime()

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
    occurredAt: JAN_15,
    rawRef: null,
    source: "manual",
    state: "confirmed",
    updatedAt: 0,
    ...overrides,
  }
}

const MONTHLY = [
  makeTransaction({ id: "a", occurredAt: new Date(2026, 0, 15, 9).getTime() }),
  makeTransaction({ id: "b", occurredAt: new Date(2026, 1, 15, 9).getTime() }),
  makeTransaction({ id: "c", occurredAt: new Date(2026, 2, 15, 9).getTime() }),
]

describe("missingRange", () => {
  it("starts after the latest transaction", () => {
    const now = new Date(2026, 4, 1, 9).getTime()
    const mar15 = new Date(2026, 2, 15, 9).getTime()

    expect(missingRange(MONTHLY, now)).toEqual({ end: now, start: mar15 })
  })

  it("falls back to the last 30 days without history", () => {
    const now = new Date(2026, 4, 1, 9).getTime()

    expect(missingRange([], now)).toEqual({ end: now, start: now - 30 * DAY })
  })
})

describe("suggestRecurringTransactions", () => {
  it("projects the next payment on the same calendar day", () => {
    const suggestions = suggestRecurringTransactions(
      MONTHLY,
      new Date(2026, 3, 20, 9).getTime()
    )

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      accountId: null,
      amount: 5000,
      categoryId: "services",
      merchant: "Netflix",
      occurredAt: new Date(2026, 3, 15, 9).getTime(),
    })
  })

  it("skips a date that already has a matching transaction", () => {
    const recorded = [
      ...MONTHLY,
      makeTransaction({
        id: "d",
        occurredAt: new Date(2026, 3, 15, 9).getTime(),
      }),
    ]

    expect(
      suggestRecurringTransactions(recorded, new Date(2026, 3, 20, 9).getTime())
    ).toEqual([])
  })

  it("carries the recurring account", () => {
    const card = [
      makeTransaction({
        accountId: "card",
        id: "a",
        occurredAt: new Date(2026, 0, 15, 9).getTime(),
      }),
      makeTransaction({
        accountId: "card",
        id: "b",
        occurredAt: new Date(2026, 1, 15, 9).getTime(),
      }),
      makeTransaction({
        accountId: "card",
        id: "c",
        occurredAt: new Date(2026, 2, 15, 9).getTime(),
      }),
    ]

    const suggestions = suggestRecurringTransactions(
      card,
      new Date(2026, 3, 20, 9).getTime()
    )

    expect(suggestions[0]?.accountId).toBe("card")
  })
})
