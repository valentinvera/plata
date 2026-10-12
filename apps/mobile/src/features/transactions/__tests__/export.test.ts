import { describe, expect, it } from "bun:test"

import type { Account } from "../accounts"
import { DEFAULT_CATEGORIES } from "../categories"
import { buildExport, transactionsToCsv, transactionsToJson } from "../export"
import type { Transaction } from "../types"

const ACCOUNTS: readonly Account[] = [
  { createdAt: 0, id: "cash", kind: "cash", name: "Efectivo" },
]

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
    expect(transactionsToCsv([], DEFAULT_CATEGORIES, ACCOUNTS)).toBe(
      "date,amount,currency,kind,category,merchant,note,account,source,state"
    )
  })

  it("writes a row with resolved labels and a formatted amount", () => {
    const csv = transactionsToCsv(
      [makeTransaction()],
      DEFAULT_CATEGORIES,
      ACCOUNTS
    )

    expect(csv.split("\n")[1]).toBe(
      "2026-01-01T12:00:00.000Z,1234.56,ARS,expense,Supermercado,Carrefour,,Efectivo,manual,confirmed"
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
      DEFAULT_CATEGORIES,
      ACCOUNTS
    )

    expect(csv).toContain('"Bar ""El, Sol""\nSRL"')
    expect(csv).toContain('"line1,line2"')
  })

  it("neutralizes formula-leading cells", () => {
    const csv = transactionsToCsv(
      [makeTransaction({ merchant: "=SUM(A1)", note: "@cmd" })],
      DEFAULT_CATEGORIES,
      ACCOUNTS
    )

    expect(csv).toContain("'=SUM(A1)")
    expect(csv).toContain("'@cmd")
  })

  it("falls back to the raw id when a label is unknown", () => {
    const csv = transactionsToCsv(
      [makeTransaction({ accountId: "custom", categoryId: "custom" })],
      [],
      []
    )

    expect(csv.split("\n")[1]).toContain(",custom,")
  })
})

describe("transactionsToJson", () => {
  it("round-trips the transactions and accounts with a version", () => {
    const transaction = makeTransaction()
    const parsed = JSON.parse(transactionsToJson([transaction], ACCOUNTS))

    expect(parsed.version).toBe(1)
    expect(parsed.transactions).toEqual([transaction])
    expect(parsed.accounts).toEqual(ACCOUNTS)
  })
})

describe("buildExport", () => {
  it("builds a csv bundle", () => {
    const bundle = buildExport(
      "csv",
      [makeTransaction()],
      DEFAULT_CATEGORIES,
      ACCOUNTS
    )

    expect(bundle.filename).toBe("plata-transactions.csv")
    expect(bundle.mimeType).toBe("text/csv")
  })

  it("builds a json bundle", () => {
    const bundle = buildExport("json", [], DEFAULT_CATEGORIES, ACCOUNTS)

    expect(bundle.filename).toBe("plata-transactions.json")
    expect(bundle.mimeType).toBe("application/json")
  })
})
