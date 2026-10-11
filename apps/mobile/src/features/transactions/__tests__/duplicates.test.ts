import { describe, expect, it } from "bun:test"

import { findDuplicateGroups } from "../duplicates"
import type { Transaction } from "../types"

const MINUTE = 60 * 1000
// Local 09:00 keeps the base timestamp precise (not the noon placeholder used
// for date-only inputs) regardless of the machine timezone.
const START = new Date(2026, 0, 1, 9, 0, 0, 0).getTime()
// Local noon is the placeholder the parser stores when only a date is known.
const NOON = new Date(2026, 0, 1, 12, 0, 0, 0).getTime()

function makeTransaction(overrides: Partial<Transaction>): Transaction {
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

describe("findDuplicateGroups", () => {
  it("groups near-simultaneous identical transactions", () => {
    const groups = findDuplicateGroups([
      makeTransaction({ id: "a", occurredAt: START }),
      makeTransaction({ id: "b", occurredAt: START + MINUTE }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].transactions.map((item) => item.id)).toEqual(["a", "b"])
  })

  it("ignores transactions outside the window", () => {
    const groups = findDuplicateGroups([
      makeTransaction({ id: "a", occurredAt: START }),
      makeTransaction({ id: "b", occurredAt: START + 30 * MINUTE }),
    ])

    expect(groups).toEqual([])
  })

  it("does not group transactions that differ", () => {
    const groups = findDuplicateGroups([
      makeTransaction({ id: "a" }),
      makeTransaction({ id: "b", amount: 6000 }),
      makeTransaction({ id: "c", merchant: "Coto" }),
      makeTransaction({ id: "d", currency: "USD" }),
      makeTransaction({ id: "e", kind: "income" }),
    ])

    expect(groups).toEqual([])
  })

  it("ignores transactions without a merchant", () => {
    const groups = findDuplicateGroups([
      makeTransaction({ id: "a", merchant: null }),
      makeTransaction({ id: "b", merchant: null, occurredAt: START + MINUTE }),
    ])

    expect(groups).toEqual([])
  })

  it("does not collapse date-only transactions sharing the noon placeholder", () => {
    const groups = findDuplicateGroups([
      makeTransaction({ id: "a", occurredAt: NOON }),
      makeTransaction({ id: "b", occurredAt: NOON }),
    ])

    expect(groups).toEqual([])
  })

  it("groups date-only transactions only when the raw input matches", () => {
    const groups = findDuplicateGroups([
      makeTransaction({ id: "a", occurredAt: NOON, rawRef: "Compraste $50" }),
      makeTransaction({ id: "b", occurredAt: NOON, rawRef: "Compraste $50" }),
      makeTransaction({ id: "c", occurredAt: NOON, rawRef: "Otro $50" }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].transactions.map((item) => item.id)).toEqual(["a", "b"])
  })

  it("chains consecutive transactions into one group", () => {
    const groups = findDuplicateGroups([
      makeTransaction({ id: "a", occurredAt: START }),
      makeTransaction({ id: "b", occurredAt: START + MINUTE }),
      makeTransaction({ id: "c", occurredAt: START + 2 * MINUTE }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].transactions.map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ])
  })

  it("splits clusters separated by a gap", () => {
    const groups = findDuplicateGroups([
      makeTransaction({ id: "a", occurredAt: START }),
      makeTransaction({ id: "b", occurredAt: START + MINUTE }),
      makeTransaction({ id: "c", occurredAt: START + 60 * MINUTE }),
      makeTransaction({ id: "d", occurredAt: START + 61 * MINUTE }),
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0].transactions.map((item) => item.id)).toEqual(["a", "b"])
    expect(groups[1].transactions.map((item) => item.id)).toEqual(["c", "d"])
  })

  it("honors a custom window", () => {
    const transactions = [
      makeTransaction({ id: "a", occurredAt: START }),
      makeTransaction({ id: "b", occurredAt: START + 30 * MINUTE }),
    ]

    expect(findDuplicateGroups(transactions, 60 * MINUTE)).toHaveLength(1)
  })
})
