import { describe, expect, it } from "bun:test"

import { createId } from "../id"

describe("createId", () => {
  it("returns a non-empty string", () => {
    expect(createId().length).toBeGreaterThan(0)
  })

  it("returns a different value on each call", () => {
    expect(createId()).not.toBe(createId())
  })
})
