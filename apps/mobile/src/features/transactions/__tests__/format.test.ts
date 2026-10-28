import { describe, expect, it } from "bun:test"

import {
  formatAmountInput,
  formatDateInput,
  formatMonth,
  parseAmountInput,
  parseDateInput,
} from "../format"

describe("formatMonth", () => {
  it("formats the month in es-AR with a capital letter", () => {
    expect(formatMonth(new Date(2026, 9, 14).getTime())).toBe("Octubre")
  })
})

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

describe("transaction date input", () => {
  it("formats the local calendar day with an explicit year", () => {
    expect(formatDateInput(new Date(2026, 8, 5, 0, 15).getTime())).toBe(
      "05/09/2026"
    )
    expect(formatDateInput(new Date(2026, 11, 31, 23, 45).getTime())).toBe(
      "31/12/2026"
    )
  })

  it("accepts valid dates and normalizes corrections to local noon", () => {
    expect(parseDateInput("5/9/2026")).toBe(new Date(2026, 8, 5, 12).getTime())
    expect(parseDateInput(" 29/02/2024 ")).toBe(
      new Date(2024, 1, 29, 12).getTime()
    )
  })

  it.each([
    "",
    "05/09",
    "05/09/26",
    "2026-09-05",
    "31/02/2026",
    "29/02/2026",
    "31/04/2026",
    "00/09/2026",
    "01/00/2026",
    "01/13/2026",
    "01/01/0000",
    "05/09/2026abc",
  ])("rejects invalid or incomplete input: %s", (value) => {
    expect(parseDateInput(value)).toBeNull()
  })

  it("preserves the original timestamp when the calendar date is unchanged", () => {
    const original = new Date(2026, 8, 5, 23, 47, 16, 321).getTime()
    expect(parseDateInput("5/9/2026", original)).toBe(original)
    expect(parseDateInput(formatDateInput(original), original)).toBe(original)
  })

  it("moves corrections into the selected month rather than today's month", () => {
    const original = new Date(2026, 9, 28, 8, 35).getTime()
    expect(parseDateInput("30/09/2026", original)).toBe(
      new Date(2026, 8, 30, 12).getTime()
    )
  })
})

describe("exact editable cent serialization", () => {
  it("preserves two decimal places, signs and sub-unit amounts", () => {
    expect(formatAmountInput(1)).toBe("0,01")
    expect(formatAmountInput(10)).toBe("0,10")
    expect(formatAmountInput(100)).toBe("1,00")
    expect(formatAmountInput(-1)).toBe("-0,01")
    expect(formatAmountInput(-123_456)).toBe("-1234,56")
  })
  it("round-trips every cent near the safe integer limit without changing the amount", () => {
    for (let offset = 0; offset < 100; offset += 1) {
      const cents = Number.MAX_SAFE_INTEGER - offset
      expect(parseAmountInput(formatAmountInput(cents))).toBe(cents)
    }
  })
})
