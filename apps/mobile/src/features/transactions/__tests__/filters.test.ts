import { describe, expect, it } from "bun:test"

import { ALL_ACCOUNTS, NO_ACCOUNT } from "../accounts"
import {
  buildTransactionFilter,
  hasActiveFilters,
  matchesFilter,
} from "../filters"
import type { Transaction } from "../types"

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
    occurredAt: 100,
    rawRef: null,
    source: "manual",
    state: "confirmed",
    updatedAt: 0,
    ...overrides,
  }
}

describe("hasActiveFilters", () => {
  it("is false for an empty filter", () => {
    expect(hasActiveFilters({})).toBe(false)
  })

  it("ignores the all-accounts value and blank queries", () => {
    expect(hasActiveFilters({ accountId: ALL_ACCOUNTS, query: "  " })).toBe(
      false
    )
  })

  it("is true with a real filter", () => {
    expect(hasActiveFilters({ accountId: NO_ACCOUNT })).toBe(true)
    expect(hasActiveFilters({ categoryId: "food" })).toBe(true)
    expect(hasActiveFilters({ query: "coto" })).toBe(true)
  })
})

describe("buildTransactionFilter", () => {
  it("returns no clause for an empty filter", () => {
    expect(buildTransactionFilter({})).toEqual({ clause: "", params: [] })
  })

  it("builds the account, state, kind, currency and category conditions", () => {
    expect(
      buildTransactionFilter({
        accountId: "cash",
        categoryId: "food",
        currency: "ARS",
        kind: "expense",
        state: "confirmed",
      })
    ).toEqual({
      clause:
        " AND account_id = ? AND state = ? AND kind = ? AND currency = ? AND category_id = ?",
      params: ["cash", "confirmed", "expense", "ARS", "food"],
    })
  })

  it("handles the no-account filter without params", () => {
    expect(buildTransactionFilter({ accountId: NO_ACCOUNT })).toEqual({
      clause: " AND account_id IS NULL",
      params: [],
    })
  })

  it("builds date and amount ranges", () => {
    expect(
      buildTransactionFilter({
        from: 10,
        maxAmount: 500,
        minAmount: 100,
        to: 20,
      })
    ).toEqual({
      clause:
        " AND occurred_at >= ? AND occurred_at < ? AND amount >= ? AND amount <= ?",
      params: [10, 20, 100, 500],
    })
  })

  it("builds a case-insensitive text search", () => {
    expect(buildTransactionFilter({ query: "  Coto  " })).toEqual({
      clause: " AND (merchant LIKE ? OR note LIKE ?)",
      params: ["%coto%", "%coto%"],
    })
  })
})

describe("matchesFilter", () => {
  const base = makeTransaction({
    accountId: "cash",
    merchant: "Carrefour",
    note: "weekly",
  })

  it("matches an empty filter", () => {
    expect(matchesFilter(base, {})).toBe(true)
  })

  it("matches the account including the no-account case", () => {
    expect(matchesFilter(base, { accountId: "cash" })).toBe(true)
    expect(matchesFilter(base, { accountId: "card" })).toBe(false)
    expect(matchesFilter(base, { accountId: NO_ACCOUNT })).toBe(false)

    const noAccount = makeTransaction({ accountId: null })
    expect(matchesFilter(noAccount, { accountId: NO_ACCOUNT })).toBe(true)
  })

  it("matches the date and amount ranges", () => {
    expect(matchesFilter(base, { from: 100, to: 101 })).toBe(true)
    expect(matchesFilter(base, { from: 101 })).toBe(false)
    expect(matchesFilter(base, { maxAmount: 4999 })).toBe(false)
    expect(matchesFilter(base, { minAmount: 5000 })).toBe(true)
  })

  it("searches merchant and note case-insensitively", () => {
    expect(matchesFilter(base, { query: "carre" })).toBe(true)
    expect(matchesFilter(base, { query: "WEEKLY" })).toBe(true)
    expect(matchesFilter(base, { query: "coto" })).toBe(false)
  })

  it("filters by state, kind, currency and category", () => {
    expect(matchesFilter(base, { state: "suggested" })).toBe(false)
    expect(matchesFilter(base, { kind: "income" })).toBe(false)
    expect(matchesFilter(base, { currency: "USD" })).toBe(false)
    expect(matchesFilter(base, { categoryId: "fun" })).toBe(false)
  })
})
