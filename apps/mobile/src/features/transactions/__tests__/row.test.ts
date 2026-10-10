import { describe, expect, it } from "bun:test"

import { rowToTransaction, type TransactionRow } from "../row"

const row: TransactionRow = {
  account_id: "cash",
  amount: 123_456,
  category_id: "groceries",
  confidence: 0.9,
  created_at: 1,
  currency: "ARS",
  id: "tx-1",
  kind: "expense",
  merchant: "Carrefour",
  note: null,
  occurred_at: 100,
  raw_ref: null,
  source: "manual",
  state: "confirmed",
  updated_at: 2,
}

describe("rowToTransaction", () => {
  it("maps snake_case columns to the domain model", () => {
    expect(rowToTransaction(row)).toEqual({
      accountId: "cash",
      amount: 123_456,
      categoryId: "groceries",
      confidence: 0.9,
      createdAt: 1,
      currency: "ARS",
      id: "tx-1",
      kind: "expense",
      merchant: "Carrefour",
      note: null,
      occurredAt: 100,
      rawRef: null,
      source: "manual",
      state: "confirmed",
      updatedAt: 2,
    })
  })
})
