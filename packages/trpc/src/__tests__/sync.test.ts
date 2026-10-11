import { describe, expect, it } from "bun:test"

import { parseSince, pullInput, pushInput, toCursor } from "../sync"

const UPDATED_AT = "2026-01-01T12:00:00.000Z"

describe("pushInput", () => {
  it("accepts a valid encrypted payload", () => {
    const result = pushInput.safeParse({
      blobs: [
        {
          ciphertext: Buffer.from("secret").toString("base64"),
          id: "tx-1",
          updatedAt: UPDATED_AT,
        },
      ],
      deviceId: "device-1",
    })

    expect(result.success).toBe(true)
  })

  it("accepts a tombstone with a deletion timestamp", () => {
    const result = pushInput.safeParse({
      blobs: [
        {
          ciphertext: "AA==",
          deletedAt: UPDATED_AT,
          id: "tx-1",
          updatedAt: UPDATED_AT,
        },
      ],
      deviceId: "device-1",
    })

    expect(result.success).toBe(true)
  })

  it("rejects an empty ciphertext", () => {
    const result = pushInput.safeParse({
      blobs: [{ ciphertext: "", id: "tx-1", updatedAt: UPDATED_AT }],
      deviceId: "device-1",
    })

    expect(result.success).toBe(false)
  })

  it("rejects a blob whose ciphertext is not base64", () => {
    const result = pushInput.safeParse({
      blobs: [
        { ciphertext: "not base64!!", id: "tx-1", updatedAt: UPDATED_AT },
      ],
      deviceId: "device-1",
    })

    expect(result.success).toBe(false)
  })

  it("rejects a blob without a valid updatedAt", () => {
    const result = pushInput.safeParse({
      blobs: [{ ciphertext: "AA==", id: "tx-1", updatedAt: "yesterday" }],
      deviceId: "device-1",
    })

    expect(result.success).toBe(false)
  })

  it("rejects a payload without a device", () => {
    const result = pushInput.safeParse({
      blobs: [],
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

  it("accepts a cursor", () => {
    expect(pullInput.safeParse({ since: UPDATED_AT }).success).toBe(true)
  })

  it("rejects an invalid cursor", () => {
    expect(pullInput.safeParse({ since: "nope" }).success).toBe(false)
  })
})

describe("cursor helpers", () => {
  it("round-trips a date through toCursor and parseSince", () => {
    const date = new Date(UPDATED_AT)

    expect(parseSince(toCursor(date))?.getTime()).toBe(date.getTime())
  })

  it("returns null for a missing cursor", () => {
    expect(parseSince(null)).toBeNull()
    expect(parseSince(undefined)).toBeNull()
    expect(parseSince("")).toBeNull()
  })
})
