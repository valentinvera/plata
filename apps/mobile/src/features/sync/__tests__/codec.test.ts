import { describe, expect, it } from "bun:test"

import { decodeRecord, encodeRecord } from "../codec"
import { createCipher } from "../crypto"
import type { SyncRecord } from "../types"

const cipher = createCipher(new Uint8Array(32).fill(3), (length) =>
  new Uint8Array(length).fill(1)
)

const RECORD: SyncRecord = {
  deletedAt: null,
  id: "tx-1",
  payload: JSON.stringify({ amount: 1234, merchant: "Carrefour" }),
  updatedAt: Date.UTC(2026, 0, 1, 12, 0, 0),
}

describe("codec", () => {
  it("round-trips a record", () => {
    expect(decodeRecord(encodeRecord(RECORD, cipher), cipher)).toEqual(RECORD)
  })

  it("keeps the metadata in the clear and the payload encrypted", () => {
    const blob = encodeRecord(RECORD, cipher)

    expect(blob.id).toBe(RECORD.id)
    expect(blob.updatedAt).toBe(new Date(RECORD.updatedAt).toISOString())
    expect(blob.ciphertext).not.toContain("Carrefour")
  })

  it("round-trips a tombstone", () => {
    const deleted: SyncRecord = {
      ...RECORD,
      deletedAt: RECORD.updatedAt,
      payload: "",
    }

    expect(decodeRecord(encodeRecord(deleted, cipher), cipher)).toEqual(deleted)
  })
})
