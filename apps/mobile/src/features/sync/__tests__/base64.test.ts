import { describe, expect, it } from "bun:test"

import { fromBase64, toBase64 } from "../base64"

describe("base64", () => {
  it("matches Buffer for every length up to 64 bytes", () => {
    for (let length = 0; length <= 64; length += 1) {
      const bytes = Uint8Array.from(
        { length },
        (_, index) => (index * 37) % 256
      )

      expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"))
    }
  })

  it("round-trips arbitrary bytes", () => {
    const bytes = Uint8Array.from(
      { length: 100 },
      (_, index) => (index * 91) % 256
    )

    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes))
  })

  it("handles empty input", () => {
    expect(toBase64(new Uint8Array())).toBe("")
    expect(fromBase64("").length).toBe(0)
  })
})
