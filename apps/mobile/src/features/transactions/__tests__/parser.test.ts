import { describe, expect, it } from "bun:test"

import { parseAmountToCents, parseTransactionText } from "../parser"

describe("parseAmountToCents", () => {
  it("parses Argentine thousands and decimals", () => {
    expect(parseAmountToCents("$12.345,67")).toBe(1_234_567)
  })

  it("treats a dot as a thousands separator", () => {
    expect(parseAmountToCents("$1.234")).toBe(123_400)
  })

  it("parses a comma as the decimal separator", () => {
    expect(parseAmountToCents("1234,56")).toBe(123_456)
  })

  it("parses a dot as the decimal separator", () => {
    expect(parseAmountToCents("1234.56")).toBe(123_456)
  })

  it("returns null when there is no number", () => {
    expect(parseAmountToCents("sin monto")).toBeNull()
  })
})

describe("parseTransactionText", () => {
  it("parses a purchase notification", () => {
    const parsed = parseTransactionText(
      "Compraste $12.345,67 en CARREFOUR el 05/09",
      0
    )

    expect(parsed.amount).toBe(1_234_567)
    expect(parsed.currency).toBe("ARS")
    expect(parsed.kind).toBe("expense")
    expect(parsed.merchant).toBe("CARREFOUR")
    expect(parsed.occurredAt).not.toBeNull()
  })

  it("detects USD income", () => {
    const parsed = parseTransactionText("Cobraste U$S 100 de sueldo")

    expect(parsed.currency).toBe("USD")
    expect(parsed.kind).toBe("income")
  })

  it("leaves merchant and date empty when absent", () => {
    const parsed = parseTransactionText("Compraste $500")

    expect(parsed.merchant).toBeNull()
    expect(parsed.occurredAt).toBeNull()
  })
})
