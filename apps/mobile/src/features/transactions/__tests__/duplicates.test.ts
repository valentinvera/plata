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

describe("duplicate event boundaries", () => {
  const rawRef = "Pagaste $50 en Carrefour"

  it("does not turn repeated monthly notifications into duplicates", () => {
    expect(
      findDuplicateGroups([
        makeTransaction({
          id: "january",
          rawRef,
          occurredAt: new Date(2026, 0, 15, 9).getTime(),
        }),
        makeTransaction({
          id: "february",
          rawRef,
          occurredAt: new Date(2026, 1, 15, 9).getTime(),
        }),
      ])
    ).toEqual([])
  })

  it("uses the short window even when precise transactions have identical text", () => {
    const transactions = [
      makeTransaction({ id: "first", rawRef, occurredAt: START }),
      makeTransaction({ id: "later", rawRef, occurredAt: START + 30 * MINUTE }),
    ]

    expect(findDuplicateGroups(transactions)).toEqual([])
    expect(findDuplicateGroups(transactions, 60 * MINUTE)).toHaveLength(1)
  })

  it("keeps identical date-only imports from different days apart", () => {
    expect(
      findDuplicateGroups([
        makeTransaction({ id: "first", rawRef, occurredAt: NOON }),
        makeTransaction({
          id: "next-day",
          rawRef,
          occurredAt: new Date(2026, 0, 2, 12).getTime(),
        }),
      ])
    ).toEqual([])
  })

  it.each(["", "   "])(
    "does not use blank raw input as evidence of duplication",
    (blank) => {
      expect(
        findDuplicateGroups([
          makeTransaction({ id: "first", rawRef: blank, occurredAt: NOON }),
          makeTransaction({ id: "second", rawRef: blank, occurredAt: NOON }),
        ])
      ).toEqual([])
    }
  )

  it("still matches a date-only import with the same input on the same day", () => {
    const transactions = [
      makeTransaction({
        id: "screenshot",
        rawRef,
        source: "screenshot",
        occurredAt: NOON,
      }),
      makeTransaction({
        id: "notification",
        rawRef,
        source: "notification",
        occurredAt: START,
      }),
    ]

    expect(
      findDuplicateGroups(transactions)[0]?.transactions.map(({ id }) => id)
    ).toEqual(["notification", "screenshot"])
  })

  it("does not match a date-only import on the same day without matching raw input", () => {
    expect(
      findDuplicateGroups([
        makeTransaction({ id: "screenshot", rawRef, occurredAt: NOON }),
        makeTransaction({
          id: "notification",
          rawRef: "Otra compra de $50",
          occurredAt: START,
        }),
      ])
    ).toEqual([])
  })

  it("keeps precise duplicate detection working across midnight", () => {
    const transactions = [
      makeTransaction({
        id: "first",
        rawRef,
        occurredAt: new Date(2026, 0, 1, 23, 59).getTime(),
      }),
      makeTransaction({
        id: "copy",
        rawRef,
        occurredAt: new Date(2026, 0, 2, 0, 1).getTime(),
      }),
    ]

    expect(findDuplicateGroups(transactions)).toHaveLength(1)
  })

  it("finds each day's real copies without combining repeated payments across days", () => {
    const nextNoon = new Date(2026, 0, 2, 12).getTime()
    const groups = findDuplicateGroups([
      makeTransaction({ id: "first", rawRef, occurredAt: NOON }),
      makeTransaction({ id: "first-copy", rawRef, occurredAt: NOON }),
      makeTransaction({ id: "next", rawRef, occurredAt: nextNoon }),
      makeTransaction({ id: "next-copy", rawRef, occurredAt: nextNoon }),
    ])

    expect(
      groups.map(({ transactions }) => transactions.map(({ id }) => id))
    ).toEqual([
      ["first", "first-copy"],
      ["next", "next-copy"],
    ])
  })
})

describe("duplicate cluster time span", () => {
  const rawRef = "Pagaste $50 en Carrefour"

  it("does not extend the event window through a chain of nearby timestamps", () => {
    const groups = findDuplicateGroups([
      makeTransaction({ id: "first", occurredAt: START }),
      makeTransaction({ id: "copy", occurredAt: START + 4 * MINUTE }),
      makeTransaction({ id: "later", occurredAt: START + 8 * MINUTE }),
    ])

    expect(
      groups.map(({ transactions }) => transactions.map(({ id }) => id))
    ).toEqual([["first", "copy"]])
  })

  it("does not let a date-only copy bridge distinct precise events", () => {
    const groups = findDuplicateGroups([
      makeTransaction({ id: "morning", rawRef, occurredAt: START }),
      makeTransaction({ id: "date-only-copy", rawRef, occurredAt: NOON }),
      makeTransaction({
        id: "afternoon",
        rawRef,
        occurredAt: new Date(2026, 0, 1, 13).getTime(),
      }),
    ])

    expect(groups[0]?.transactions.map(({ id }) => id)).toEqual([
      "morning",
      "date-only-copy",
    ])
  })

  it("anchors the window to the first precise event when a cluster starts at noon", () => {
    const groups = findDuplicateGroups([
      makeTransaction({ id: "date-only", rawRef, occurredAt: NOON }),
      makeTransaction({
        id: "first-precise",
        rawRef,
        occurredAt: NOON + MINUTE,
      }),
      makeTransaction({ id: "later", rawRef, occurredAt: NOON + 60 * MINUTE }),
    ])

    expect(groups[0]?.transactions.map(({ id }) => id)).toEqual([
      "date-only",
      "first-precise",
    ])
  })
})

describe("duplicate merchant whitespace", () => {
  it("matches OCR spacing variants without changing the original merchant", () => {
    const first = makeTransaction({
      id: "space-a",
      merchant: "Café del Centro",
    })
    const second = makeTransaction({
      id: "space-b",
      merchant: "CAFÉ\nDEL\u00a0CENTRO",
      occurredAt: START + MINUTE,
    })
    expect(findDuplicateGroups([first, second])).toHaveLength(1)
    expect(second.merchant).toBe("CAFÉ\nDEL\u00a0CENTRO")
  })
})
