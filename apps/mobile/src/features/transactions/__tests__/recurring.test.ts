import { describe, expect, it } from "bun:test"

import { detectRecurring } from "../recurring"
import type { Transaction } from "../types"

const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2026, 0, 1)

function makeTransaction(overrides: Partial<Transaction>): Transaction {
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

describe("detectRecurring", () => {
  it("detects a monthly subscription", () => {
    const transactions = [
      makeTransaction({ id: "a", occurredAt: START }),
      makeTransaction({ id: "b", occurredAt: START + 30 * DAY }),
      makeTransaction({ id: "c", occurredAt: START + 60 * DAY }),
    ]

    expect(detectRecurring(transactions)).toEqual([
      {
        accountId: null,
        averageAmount: 5000,
        cadence: "monthly",
        categoryId: "services",
        currency: "ARS",
        lastOccurredAt: START + 60 * DAY,
        merchant: "Netflix",
        occurrences: 3,
      },
    ])
  })

  it("detects a weekly rhythm", () => {
    const transactions = [
      makeTransaction({ id: "a", merchant: "Gym", occurredAt: START }),
      makeTransaction({
        id: "b",
        merchant: "Gym",
        occurredAt: START + 7 * DAY,
      }),
      makeTransaction({
        id: "c",
        merchant: "Gym",
        occurredAt: START + 14 * DAY,
      }),
    ]

    expect(detectRecurring(transactions)[0]?.cadence).toBe("weekly")
  })

  it("ignores irregular intervals", () => {
    const transactions = [
      makeTransaction({ id: "a", occurredAt: START }),
      makeTransaction({ id: "b", occurredAt: START + 3 * DAY }),
      makeTransaction({ id: "c", occurredAt: START + 20 * DAY }),
    ]

    expect(detectRecurring(transactions)).toEqual([])
  })

  it("ignores an average interval that no single interval matches", () => {
    const transactions = [
      makeTransaction({ id: "a", occurredAt: START }),
      makeTransaction({ id: "b", occurredAt: START + 1 * DAY }),
      makeTransaction({ id: "c", occurredAt: START + 60 * DAY }),
    ]

    expect(detectRecurring(transactions)).toEqual([])
  })

  it("ignores unstable amounts", () => {
    const transactions = [
      makeTransaction({ amount: 1000, id: "a", occurredAt: START }),
      makeTransaction({ amount: 5000, id: "b", occurredAt: START + 30 * DAY }),
      makeTransaction({ amount: 9000, id: "c", occurredAt: START + 60 * DAY }),
    ]

    expect(detectRecurring(transactions)).toEqual([])
  })

  it("needs at least three occurrences by default", () => {
    const transactions = [
      makeTransaction({ id: "a", occurredAt: START }),
      makeTransaction({ id: "b", occurredAt: START + 30 * DAY }),
    ]

    expect(detectRecurring(transactions)).toEqual([])
    expect(detectRecurring(transactions, 2)).toHaveLength(1)
  })

  it("ignores income and expenses without a merchant", () => {
    const income = [
      makeTransaction({ id: "a", kind: "income", occurredAt: START }),
      makeTransaction({
        id: "b",
        kind: "income",
        occurredAt: START + 30 * DAY,
      }),
      makeTransaction({
        id: "c",
        kind: "income",
        occurredAt: START + 60 * DAY,
      }),
    ]
    const noMerchant = [
      makeTransaction({ id: "a", merchant: null, occurredAt: START }),
      makeTransaction({
        id: "b",
        merchant: null,
        occurredAt: START + 30 * DAY,
      }),
      makeTransaction({
        id: "c",
        merchant: null,
        occurredAt: START + 60 * DAY,
      }),
    ]

    expect(detectRecurring(income)).toEqual([])
    expect(detectRecurring(noMerchant)).toEqual([])
  })

  it("keeps currencies apart", () => {
    const transactions = [
      makeTransaction({ currency: "ARS", id: "a", occurredAt: START }),
      makeTransaction({
        currency: "ARS",
        id: "b",
        occurredAt: START + 30 * DAY,
      }),
      makeTransaction({
        currency: "ARS",
        id: "c",
        occurredAt: START + 60 * DAY,
      }),
      makeTransaction({ currency: "USD", id: "d", occurredAt: START }),
      makeTransaction({
        currency: "USD",
        id: "e",
        occurredAt: START + 30 * DAY,
      }),
      makeTransaction({
        currency: "USD",
        id: "f",
        occurredAt: START + 60 * DAY,
      }),
    ]

    expect(
      detectRecurring(transactions)
        .map((payment) => payment.currency)
        .sort()
    ).toEqual(["ARS", "USD"])
  })

  it("merges merchants that differ only in case or accents", () => {
    const transactions = [
      makeTransaction({ id: "a", merchant: "Netflix", occurredAt: START }),
      makeTransaction({
        id: "b",
        merchant: "netflix",
        occurredAt: START + 30 * DAY,
      }),
      makeTransaction({
        id: "c",
        merchant: " NETFLIX ",
        occurredAt: START + 60 * DAY,
      }),
    ]

    expect(detectRecurring(transactions)).toHaveLength(1)
  })

  it("keeps separate accounts apart", () => {
    const transactions = [
      makeTransaction({ accountId: "card", id: "a", occurredAt: START }),
      makeTransaction({
        accountId: "card",
        id: "b",
        occurredAt: START + 30 * DAY,
      }),
      makeTransaction({
        accountId: "card",
        id: "c",
        occurredAt: START + 60 * DAY,
      }),
      makeTransaction({
        accountId: "cash",
        id: "d",
        occurredAt: START + 15 * DAY,
      }),
      makeTransaction({
        accountId: "cash",
        id: "e",
        occurredAt: START + 45 * DAY,
      }),
      makeTransaction({
        accountId: "cash",
        id: "f",
        occurredAt: START + 75 * DAY,
      }),
    ]

    expect(detectRecurring(transactions)).toHaveLength(2)
  })
})

describe("recurring merchant whitespace", () => {
  it("learns one series across OCR whitespace variants", () => {
    const history = ["Pet Shop", "PET\nSHOP", "Pet\u00a0Shop"].map(
      (merchant, index) =>
        makeTransaction({
          id: `space-${index}`,
          merchant,
          occurredAt: START + index * 30 * DAY,
        })
    )
    expect(detectRecurring(history)).toMatchObject([
      { cadence: "monthly", occurrences: 3 },
    ])
  })
})
