import { describe, expect, it } from "bun:test"

import { decodeCursor, encodeCursor, pullInput, pushInput } from "../sync"

const UPDATED_AT = "2026-01-01T12:00:00.000Z"

function blob(overrides: Record<string, unknown> = {}) {
  return {
    ciphertext: Buffer.from("secret").toString("base64"),
    id: "tx-1",
    updatedAt: UPDATED_AT,
    ...overrides,
  }
}

describe("pushInput", () => {
  it("accepts a valid encrypted payload", () => {
    const result = pushInput.safeParse({
      blobs: [blob()],
      deviceId: "device-1",
    })

    expect(result.success).toBe(true)
  })

  it("accepts a tombstone with a deletion timestamp", () => {
    const result = pushInput.safeParse({
      blobs: [blob({ ciphertext: "AA==", deletedAt: UPDATED_AT })],
      deviceId: "device-1",
    })

    expect(result.success).toBe(true)
  })

  it("rejects an empty ciphertext", () => {
    const result = pushInput.safeParse({
      blobs: [blob({ ciphertext: "" })],
      deviceId: "device-1",
    })

    expect(result.success).toBe(false)
  })

  it("rejects a blob whose ciphertext is not base64", () => {
    const result = pushInput.safeParse({
      blobs: [blob({ ciphertext: "not base64!!" })],
      deviceId: "device-1",
    })

    expect(result.success).toBe(false)
  })

  it("rejects a blob without a valid updatedAt", () => {
    const result = pushInput.safeParse({
      blobs: [blob({ updatedAt: "yesterday" })],
      deviceId: "device-1",
    })

    expect(result.success).toBe(false)
  })

  it("rejects a payload without a device", () => {
    expect(pushInput.safeParse({ blobs: [] }).success).toBe(false)
  })

  it("rejects a ciphertext over the per-blob cap", () => {
    const result = pushInput.safeParse({
      blobs: [blob({ ciphertext: "A".repeat(120_000) })],
      deviceId: "device-1",
    })

    expect(result.success).toBe(false)
  })

  it("rejects more blobs than the batch cap", () => {
    const result = pushInput.safeParse({
      blobs: Array.from({ length: 101 }, (_, index) =>
        blob({ id: `tx-${index}` })
      ),
      deviceId: "device-1",
    })

    expect(result.success).toBe(false)
  })

  it("rejects a payload over the total size cap", () => {
    const big = "A".repeat(60_000)
    const result = pushInput.safeParse({
      blobs: Array.from({ length: 100 }, (_, index) =>
        blob({ ciphertext: big, id: `tx-${index}` })
      ),
      deviceId: "device-1",
    })

    expect(result.success).toBe(false)
  })
})

describe("pullInput", () => {
  it("accepts an empty payload", () => {
    expect(pullInput.safeParse({}).success).toBe(true)
  })

  it("accepts an omitted payload", () => {
    expect(pullInput.safeParse(undefined).success).toBe(true)
  })

  it("accepts an opaque cursor", () => {
    expect(pullInput.safeParse({ since: "1234:tx-1" }).success).toBe(true)
  })

  it("rejects an empty cursor", () => {
    expect(pullInput.safeParse({ since: "" }).success).toBe(false)
  })
})

describe("cursor helpers", () => {
  it("round-trips a cursor", () => {
    const date = new Date(UPDATED_AT)
    const cursor = { id: "tx:1/with weird chars", updatedAt: date }
    const decoded = decodeCursor(encodeCursor(cursor))

    expect(decoded?.id).toBe(cursor.id)
    expect(decoded?.updatedAt.getTime()).toBe(date.getTime())
  })

  it("returns null for a missing cursor", () => {
    expect(decodeCursor(null)).toBeNull()
    expect(decodeCursor(undefined)).toBeNull()
    expect(decodeCursor("")).toBeNull()
  })

  it("returns null for a malformed cursor", () => {
    expect(decodeCursor("no-separator")).toBeNull()
    expect(decodeCursor(":tx-1")).toBeNull()
    expect(decodeCursor("not-a-number:tx-1")).toBeNull()
    expect(decodeCursor("1234:")).toBeNull()
  })
})
