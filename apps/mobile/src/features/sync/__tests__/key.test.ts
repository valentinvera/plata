import { describe, expect, it } from "bun:test"

import {
  createSyncKey,
  decodeSyncKey,
  encodeSyncKey,
  SYNC_KEY_BYTES,
} from "../key"

function deterministic(length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, index) => (index * 7) % 256)
}

describe("createSyncKey", () => {
  it("returns the expected number of bytes", () => {
    expect(createSyncKey(deterministic).length).toBe(SYNC_KEY_BYTES)
  })

  it("rejects a short random source", () => {
    expect(() => createSyncKey(() => new Uint8Array(8))).toThrow()
  })
})

describe("sync key encoding", () => {
  it("round-trips a key", () => {
    const key = createSyncKey(deterministic)

    expect(Array.from(decodeSyncKey(encodeSyncKey(key)) ?? [])).toEqual(
      Array.from(key)
    )
  })

  it("returns null for a value of the wrong length", () => {
    expect(decodeSyncKey("AAAA")).toBeNull()
  })
})
