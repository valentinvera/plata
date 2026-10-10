import { describe, expect, it } from "bun:test"

import { formatAmountInput, parseAmountInput } from "../format"

describe("formatAmountInput", () => {
  it("formats cents as an editable es-AR value", () => {
    expect(formatAmountInput(150_050)).toBe("1500,50")
    expect(formatAmountInput(0)).toBe("0,00")
    expect(formatAmountInput(123_456)).toBe("1234,56")
  })

  it("round-trips through parseAmountInput", () => {
    expect(parseAmountInput(formatAmountInput(123_456))).toBe(123_456)
    expect(parseAmountInput(formatAmountInput(999))).toBe(999)
  })
})

describe("parseAmountInput", () => {
  it("parses valid es-AR amounts into cents", () => {
    expect(parseAmountInput("1500")).toBe(150_000)
    expect(parseAmountInput("1500,50")).toBe(150_050)
    expect(parseAmountInput("1500,5")).toBe(150_050)
    expect(parseAmountInput("1.500")).toBe(150_000)
    expect(parseAmountInput("1.500,50")).toBe(150_050)
    expect(parseAmountInput("1.500.000,50")).toBe(150_000_050)
    expect(parseAmountInput(" 42 ")).toBe(4200)
  })

  it("rejects malformed input instead of coercing a numeric prefix", () => {
    expect(parseAmountInput("")).toBeNull()
    expect(parseAmountInput("abc")).toBeNull()
    expect(parseAmountInput("12abc34")).toBeNull()
    expect(parseAmountInput("1,2,3")).toBeNull()
    expect(parseAmountInput("1.2.3")).toBeNull()
    expect(parseAmountInput("1,234")).toBeNull()
    expect(parseAmountInput(",50")).toBeNull()
  })

  it("parses large values exactly and rejects unsafe cents", () => {
    expect(parseAmountInput("90071992547409,90")).toBe(9_007_199_254_740_990)
    expect(parseAmountInput("90071992547409,92")).toBeNull()
    expect(parseAmountInput("90071992547409,93")).toBeNull()
  })
})
