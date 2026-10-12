import { describe, expect, it } from "bun:test"

import type { Transaction } from "../../transactions/types"
import {
  decodeTransactionPayload,
  encodeTransactionPayload,
} from "../transaction-record"

const TRANSACTION: Transaction = {
  accountId: "card",
  amount: 1234,
  categoryId: "food",
  confidence: 0.8,
  createdAt: 100,
  currency: "ARS",
  id: "tx-1",
  kind: "expense",
  merchant: "Carrefour",
  note: null,
  occurredAt: 200,
  rawRef: null,
  source: "manual",
  state: "confirmed",
  updatedAt: 300,
}

describe("transaction payload", () => {
  it("round-trips a transaction", () => {
    expect(
      decodeTransactionPayload(encodeTransactionPayload(TRANSACTION))
    ).toEqual(TRANSACTION)
  })

  it("returns null for invalid JSON", () => {
    expect(decodeTransactionPayload("not json")).toBeNull()
  })

  it("returns null when a required field is missing", () => {
    const missingAmount = { ...TRANSACTION, amount: undefined }

    expect(decodeTransactionPayload(JSON.stringify(missingAmount))).toBeNull()
  })

  it("returns null for an unknown enum value", () => {
    const wrongCurrency = { ...TRANSACTION, currency: "EUR" }

    expect(decodeTransactionPayload(JSON.stringify(wrongCurrency))).toBeNull()
  })

  it("returns null for a non-object payload", () => {
    expect(decodeTransactionPayload("42")).toBeNull()
  })
})
