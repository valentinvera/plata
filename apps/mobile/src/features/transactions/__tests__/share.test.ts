import { describe, expect, it } from "bun:test"

import { getSharedText } from "../share"

describe("getSharedText", () => {
  it("returns the trimmed shared text", () => {
    expect(getSharedText({ text: "  Compraste $500  " })).toBe("Compraste $500")
  })

  it("returns null for empty or missing text", () => {
    expect(getSharedText({ text: "   " })).toBeNull()
    expect(getSharedText({})).toBeNull()
    expect(getSharedText(null)).toBeNull()
  })
})
