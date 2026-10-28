import { describe, expect, it } from "bun:test"

import { suggestRecurringTransactions } from "../catchup-recurring"
import type { Transaction } from "../types"

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

describe("recurring catch-up reconstruction", () => {
  const apr15 = new Date(2026, 3, 15, 9).getTime()
  const apr20 = new Date(2026, 3, 20, 9).getTime()

  it("finds a missing payment even after another merchant was recorded", () => {
    const history = [
      ...MONTHLY,
      makeTransaction({
        id: "coffee",
        merchant: "Café",
        occurredAt: new Date(2026, 3, 18, 9).getTime(),
      }),
    ]

    expect(suggestRecurringTransactions(history, apr20)).toMatchObject([
      { merchant: "Netflix", occurredAt: apr15 },
    ])
  })

  it("does not mistake a refund for a recorded recurring expense", () => {
    const history = [
      ...MONTHLY,
      makeTransaction({ id: "refund", kind: "income", occurredAt: apr15 }),
    ]

    expect(suggestRecurringTransactions(history, apr20)).toHaveLength(1)
  })

  it("does not learn a recurring pattern from unconfirmed suggestions", () => {
    const history = MONTHLY.map((transaction) => ({
      ...transaction,
      state: "suggested" as const,
    }))

    expect(suggestRecurringTransactions(history, apr20)).toEqual([])
  })

  it("does not let an unconfirmed outlier erase a confirmed pattern", () => {
    const history = [
      ...MONTHLY,
      makeTransaction({
        id: "pending-outlier",
        amount: 20_000,
        occurredAt: new Date(2026, 3, 1, 9).getTime(),
        state: "suggested",
      }),
    ]

    expect(suggestRecurringTransactions(history, apr20)).toMatchObject([
      { amount: 5000, occurredAt: apr15 },
    ])
  })

  it("skips an occurrence already awaiting confirmation without losing the next", () => {
    const history = [
      ...MONTHLY,
      makeTransaction({
        id: "pending",
        occurredAt: apr15,
        state: "suggested",
      }),
    ]

    expect(suggestRecurringTransactions(history, apr20)).toEqual([])
    expect(
      suggestRecurringTransactions(history, new Date(2026, 4, 20, 9).getTime())
    ).toMatchObject([{ occurredAt: new Date(2026, 4, 15, 9).getTime() }])
  })

  it("keeps accounts and currencies distinct when matching pending entries", () => {
    for (const override of [
      { accountId: "cash" },
      { currency: "USD" as const },
    ]) {
      const history = [
        ...MONTHLY,
        makeTransaction({
          ...override,
          id: "other-payment",
          occurredAt: apr15,
          state: "suggested",
        }),
      ]

      expect(suggestRecurringTransactions(history, apr20)).toMatchObject([
        { accountId: null, currency: "ARS", occurredAt: apr15 },
      ])
    }
  })

  it.each([2024, 2026])("keeps the 31st after February in %s", (year) => {
    const history = [
      new Date(year - 1, 10, 30, 9),
      new Date(year - 1, 11, 31, 9),
      new Date(year, 0, 31, 9),
    ].map((date) =>
      makeTransaction({
        id: date.toISOString(),
        occurredAt: date.getTime(),
      })
    )
    const suggestions = suggestRecurringTransactions(
      history,
      new Date(year, 3, 5, 9).getTime()
    )

    expect(suggestions.map(({ occurredAt }) => occurredAt)).toEqual([
      new Date(year, 2, 0, 9).getTime(),
      new Date(year, 2, 31, 9).getTime(),
    ])
  })

  it("does not project a payment that is not due yet", () => {
    expect(
      suggestRecurringTransactions(MONTHLY, new Date(2026, 3, 15, 8).getTime())
    ).toEqual([])
  })
})

describe("recurring calendar anchors", () => {
  it.each([29, 30, 31])(
    "restores billing day %s after confirming February",
    (day) => {
      const history = [
        new Date(2025, 11, day, 9),
        new Date(2026, 0, day, 9),
        new Date(2026, 1, 28, 9),
      ].map((date) =>
        makeTransaction({ id: date.toISOString(), occurredAt: date.getTime() })
      )

      expect(
        suggestRecurringTransactions(history, new Date(2026, 3, 5, 9).getTime())
      ).toMatchObject([{ occurredAt: new Date(2026, 2, day, 9).getTime() }])
    }
  )

  it("preserves the local time of weekly payments across calendar changes", () => {
    const history = [11, 18, 25].map((day) =>
      makeTransaction({
        id: `weekly-${day}`,
        occurredAt: new Date(2026, 9, day, 9).getTime(),
      })
    )

    expect(
      suggestRecurringTransactions(
        history,
        new Date(2026, 10, 10, 9).getTime()
      ).map(({ occurredAt }) => occurredAt)
    ).toEqual([
      new Date(2026, 10, 1, 9).getTime(),
      new Date(2026, 10, 8, 9).getTime(),
    ])
  })
})

describe("exclusive recurring occurrence matching", () => {
  const history = [11, 18, 25].map((day) =>
    makeTransaction({
      id: `weekly-${day}`,
      occurredAt: new Date(2026, 9, day, 9).getTime(),
    })
  )
  const firstDue = new Date(2026, 10, 1, 9).getTime()
  const secondDue = new Date(2026, 10, 8, 9).getTime()
  const now = new Date(2026, 10, 10, 9).getTime()

  function pending(occurredAt: number, id = "pending") {
    return makeTransaction({ id, occurredAt, state: "suggested" })
  }

  it.each([
    [4, secondDue],
    [5, firstDue],
  ])(
    "matches a pending payment on November %s to only its nearest week",
    (day, missing) => {
      const suggestions = suggestRecurringTransactions(
        [...history, pending(new Date(2026, 10, day, 9).getTime())],
        now
      )

      expect(suggestions.map(({ occurredAt }) => occurredAt)).toEqual([missing])
    }
  )

  it.each([
    [-1, secondDue],
    [0, secondDue],
    [1, firstDue],
  ])(
    "assigns the midpoint once, preferring the earlier occurrence at offset %s",
    (offset, missing) => {
      const midpoint = (firstDue + secondDue) / 2
      const suggestions = suggestRecurringTransactions(
        [...history, pending(midpoint + offset)],
        now
      )

      expect(suggestions.map(({ occurredAt }) => occurredAt)).toEqual([missing])
    }
  )

  it("does not use an entry closer to the last recorded week to hide a missing week", () => {
    const suggestions = suggestRecurringTransactions(
      [...history, pending(new Date(2026, 9, 28, 9).getTime())],
      now
    )

    expect(suggestions.map(({ occurredAt }) => occurredAt)).toEqual([
      firstDue,
      secondDue,
    ])
  })

  it("does not use a future occurrence to cover an older missing week", () => {
    const suggestions = suggestRecurringTransactions(
      [...history, pending(new Date(2026, 10, 12, 9).getTime())],
      now
    )

    expect(suggestions.map(({ occurredAt }) => occurredAt)).toEqual([
      firstDue,
      secondDue,
    ])
  })

  it("still suppresses two occurrences when each has its own pending payment", () => {
    const suggestions = suggestRecurringTransactions(
      [
        ...history,
        pending(new Date(2026, 10, 2, 9).getTime(), "first"),
        pending(new Date(2026, 10, 7, 9).getTime(), "second"),
      ],
      now
    )

    expect(suggestions).toEqual([])
  })

  it("does not spread duplicate pending entries across separate weeks", () => {
    const suggestions = suggestRecurringTransactions(
      [
        ...history,
        pending(new Date(2026, 10, 3, 9).getTime(), "first"),
        pending(new Date(2026, 10, 4, 9).getTime(), "second"),
      ],
      now
    )

    expect(suggestions.map(({ occurredAt }) => occurredAt)).toEqual([secondDue])
  })

  it.each([
    [-5 * 24 * 60 * 60 * 1000, 0],
    [5 * 24 * 60 * 60 * 1000, 0],
    [5 * 24 * 60 * 60 * 1000 + 1, 1],
  ])("retains the monthly tolerance at offset %s", (offset, count) => {
    const due = new Date(2026, 3, 15, 9).getTime()
    expect(
      suggestRecurringTransactions(
        [...MONTHLY, pending(due + offset)],
        new Date(2026, 3, 25, 9).getTime()
      )
    ).toHaveLength(count)
  })
})
