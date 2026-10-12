import { describe, expect, it } from "bun:test"

import { DEFAULT_CATEGORIES } from "../categories"
import { buildExport, transactionsToCsv, transactionsToJson } from "../export"
import type { Transaction } from "../types"

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    accountId: "cash",
    amount: 123_456,
    categoryId: "groceries",
    confidence: null,
    createdAt: 0,
    currency: "ARS",
    id: "tx-1",
    kind: "expense",
    merchant: "Carrefour",
    note: null,
    occurredAt: Date.UTC(2026, 0, 1, 12, 0, 0),
    rawRef: null,
    source: "manual",
    state: "confirmed",
    updatedAt: 0,
    ...overrides,
  }
}

describe("transactionsToCsv", () => {
  it("writes only the header for an empty list", () => {
    expect(transactionsToCsv([], DEFAULT_CATEGORIES)).toBe(
      "date,amount,currency,kind,category,merchant,note,account,source,state"
    )
  })

  it("writes a row with the resolved category name and formatted amount", () => {
    const csv = transactionsToCsv([makeTransaction()], DEFAULT_CATEGORIES)

    expect(csv.split("\n")[1]).toBe(
      "2026-01-01T12:00:00.000Z,1234.56,ARS,expense,Supermercado,Carrefour,,cash,manual,confirmed"
    )
  })

  it("escapes commas, quotes and newlines", () => {
    const csv = transactionsToCsv(
      [
        makeTransaction({
          merchant: 'Bar "El, Sol"\nSRL',
          note: "line1,line2",
        }),
      ],
      DEFAULT_CATEGORIES
    )

    expect(csv).toContain('"Bar ""El, Sol""\nSRL"')
    expect(csv).toContain('"line1,line2"')
  })

  it("falls back to the raw category id when unknown", () => {
    const csv = transactionsToCsv(
      [makeTransaction({ categoryId: "custom" })],
      []
    )

    expect(csv.split("\n")[1]).toContain(",custom,")
  })
})

describe("transactionsToJson", () => {
  it("round-trips the transactions with a version", () => {
    const transaction = makeTransaction()
    const parsed = JSON.parse(transactionsToJson([transaction]))

    expect(parsed.version).toBe(1)
    expect(parsed.transactions).toEqual([transaction])
  })
})

describe("buildExport", () => {
  it("builds a csv bundle", () => {
    const bundle = buildExport("csv", [makeTransaction()], DEFAULT_CATEGORIES)

    expect(bundle.filename).toBe("plata-transactions.csv")
    expect(bundle.mimeType).toBe("text/csv")
  })

  it("builds a json bundle", () => {
    const bundle = buildExport("json", [], DEFAULT_CATEGORIES)

    expect(bundle.filename).toBe("plata-transactions.json")
    expect(bundle.mimeType).toBe("application/json")
  })
})
