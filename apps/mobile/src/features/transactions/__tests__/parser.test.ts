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

  it("isolates the amount token from the rest of the text", () => {
    expect(parseTransactionText("Compraste $500 el 05/09").amount).toBe(50_000)
    expect(parseTransactionText("$12.345 el 05/09").amount).toBe(1_234_500)
  })

  it("rejects dates that overflow into another day", () => {
    expect(
      parseTransactionText("Pago $500 el 31/02/2026", 0).occurredAt
    ).toBeNull()
  })

  it("does not treat longer words as income keywords", () => {
    const parsed = parseTransactionText(
      "Pagaste impuesto a los Ingresos Brutos $7.000"
    )
    expect(parsed.kind).toBe("expense")
  })

  it("keeps delimiter words that are part of the merchant name", () => {
    expect(
      parseTransactionText("Compraste $500 en Café del Centro").merchant
    ).toBe("Café del Centro")
    expect(
      parseTransactionText("Compraste $500 en Todo por Dos").merchant
    ).toBe("Todo por Dos")
  })
})

describe("imported dates without a year", () => {
  it("uses the previous year across January instead of creating a future expense", () => {
    const now = new Date(2026, 0, 5, 9).getTime()
    expect(parseTransactionText("Pagaste $500 el 31/12", now).occurredAt).toBe(
      new Date(2025, 11, 31, 12).getTime()
    )
  })

  it("keeps today's calendar date even before noon", () => {
    const now = new Date(2026, 0, 1, 0, 15).getTime()
    expect(parseTransactionText("Pagaste $500 el 01/01", now).occurredAt).toBe(
      new Date(2026, 0, 1, 12).getTime()
    )
  })

  it("keeps an earlier day in the current year", () => {
    const now = new Date(2026, 9, 28, 9).getTime()
    expect(parseTransactionText("Pagaste $500 el 05/09", now).occurredAt).toBe(
      new Date(2026, 8, 5, 12).getTime()
    )
  })

  it.each([2026, 2103])(
    "finds the most recent valid leap day before %s",
    (year) => {
      const now = new Date(year, 2, 1, 9).getTime()
      const leapYear = year === 2026 ? 2024 : 2096
      expect(
        parseTransactionText("Pagaste $500 el 29/02", now).occurredAt
      ).toBe(new Date(leapYear, 1, 29, 12).getTime())
    }
  )

  it.each(["31/02", "31/04", "00/12", "01/13"])(
    "still rejects impossible dates: %s",
    (date) => {
      expect(
        parseTransactionText(
          `Pagaste $500 el ${date}`,
          new Date(2026, 0, 5).getTime()
        ).occurredAt
      ).toBeNull()
    }
  )

  it("retains explicit future years in both supported forms", () => {
    const now = new Date(2026, 0, 5, 9).getTime()
    for (const date of ["31/12/2027", "31/12/27"]) {
      expect(
        parseTransactionText(`Pagaste $500 el ${date}`, now).occurredAt
      ).toBe(new Date(2027, 11, 31, 12).getTime())
    }
  })

  it("does not move an invalid explicit leap date to another year", () => {
    expect(
      parseTransactionText("Pagaste $500 el 29/02/2026").occurredAt
    ).toBeNull()
  })
})
