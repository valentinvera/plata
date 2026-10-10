import { describe, expect, it } from "bun:test"

import { formatAmountInput } from "../format"
import { parseAmountToCents } from "../parser"

describe("formatAmountInput", () => {
  it("formats cents as an editable es-AR value", () => {
    expect(formatAmountInput(150_050)).toBe("1500,50")
    expect(formatAmountInput(0)).toBe("0,00")
    expect(formatAmountInput(123_456)).toBe("1234,56")
  })

  it("round-trips through the amount parser", () => {
    expect(parseAmountToCents(formatAmountInput(123_456))).toBe(123_456)
    expect(parseAmountToCents(formatAmountInput(999))).toBe(999)
  })
})
