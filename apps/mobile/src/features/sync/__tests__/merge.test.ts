import { describe, expect, it } from "bun:test"

import { shouldApplyRemote } from "../merge"
import type { SyncRecord } from "../types"

function record(overrides: Partial<SyncRecord> = {}): SyncRecord {
  return {
    deletedAt: null,
    id: "tx-1",
    payload: "{}",
    updatedAt: 100,
    ...overrides,
  }
}

describe("shouldApplyRemote", () => {
  it("applies when there is no local copy", () => {
    expect(shouldApplyRemote(null, record())).toBe(true)
  })

  it("applies a newer remote", () => {
    expect(
      shouldApplyRemote(record({ updatedAt: 100 }), record({ updatedAt: 200 }))
    ).toBe(true)
  })

  it("ignores an older remote", () => {
    expect(
      shouldApplyRemote(record({ updatedAt: 200 }), record({ updatedAt: 100 }))
    ).toBe(false)
  })

  it("ignores an identical remote", () => {
    expect(shouldApplyRemote(record(), record())).toBe(false)
  })

  it("applies a tombstone at the same logical time", () => {
    expect(shouldApplyRemote(record(), record({ deletedAt: 100 }))).toBe(true)
  })

  it("applies different content at the same logical time", () => {
    expect(
      shouldApplyRemote(
        record({ payload: "{}" }),
        record({ payload: '{"a":1}' })
      )
    ).toBe(true)
  })
})
