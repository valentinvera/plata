import { describe, expect, it } from "bun:test"
import {
  buildCatchUpSuggestions,
  isSuggestionValid,
  splitCatchUpTexts,
} from "../catchup"
import { selectTransactionText } from "../ocr"

describe("splitCatchUpTexts", () => {
  it("splits, trims and drops empty lines", () => {
    expect(splitCatchUpTexts("  a \n\n b  \n")).toEqual(["a", "b"])
  })
})

describe("buildCatchUpSuggestions", () => {
  it("parses and categorizes each line", () => {
    const [first, second] = buildCatchUpSuggestions([
      "Compraste $12.345,67 en CARREFOUR el 05/09",
      "Pagaste $4.500 en PEDIDOSYA",
    ])

    expect(first).toMatchObject({
      amount: 1_234_567,
      categoryId: "groceries",
      currency: "ARS",
      kind: "expense",
      merchant: "CARREFOUR",
    })
    expect(second).toMatchObject({
      amount: 450_000,
      categoryId: "food",
    })
  })

  it("flags lines without a positive amount as invalid", () => {
    const [suggestion] = buildCatchUpSuggestions(
      splitCatchUpTexts("not a transaction\n\n")
    )

    expect(suggestion ? isSuggestionValid(suggestion) : false).toBe(false)
  })
})

describe("catch-up non-transaction amounts", () => {
  it.each([
    "Saldo disponible $250.000",
    "Límite de compra $500.000",
    "BALANCE USD $1.200,50",
    "Disponible $35.000",
    "Cierre de tarjeta $80.000",
  ])("does not offer %s for confirmation", (text) => {
    const [suggestion] = buildCatchUpSuggestions([text])

    expect(suggestion?.raw).toBe(text)
    expect(suggestion?.amount).toBeNull()
    expect(suggestion && isSuggestionValid(suggestion)).toBe(false)
  })

  it("only offers transactions from a batch containing balances and limits", () => {
    const suggestions = buildCatchUpSuggestions(
      splitCatchUpTexts(
        [
          "Saldo disponible $250.000",
          "Pagaste $4.500 en PEDIDOSYA el 28/10",
          "Límite de compra $500.000",
          "Cobraste USD $1.200,50 en ACME el 28/10",
        ].join("\n")
      ),
      new Date(2026, 9, 28, 12).getTime()
    )
    const valid = suggestions.filter(isSuggestionValid)

    expect(suggestions).toHaveLength(4)
    expect(valid).toHaveLength(2)
    expect(valid[0]).toMatchObject({
      amount: 450_000,
      categoryId: "food",
      currency: "ARS",
      kind: "expense",
      merchant: "PEDIDOSYA",
    })
    expect(valid[1]).toMatchObject({
      amount: 120_050,
      currency: "USD",
      kind: "income",
      merchant: "ACME",
    })
  })

  it("keeps concise manual entries without a payment verb", () => {
    const valid = buildCatchUpSuggestions([
      "Alquiler $150.000",
      "$4.500",
      "Pagaste $2.000 en SALDOS",
    ]).filter(isSuggestionValid)

    expect(valid.map(({ amount }) => amount)).toEqual([
      15_000_000, 450_000, 200_000,
    ])
  })
})

describe("catch-up across a year boundary", () => {
  it("keeps December and January imports in the right years", () => {
    const suggestions = buildCatchUpSuggestions(
      ["Pagaste $500 en SUBE el 31/12", "Pagaste $1.000 en CARREFOUR el 02/01"],
      new Date(2026, 0, 5, 9).getTime()
    ).filter(isSuggestionValid)

    expect(suggestions.map(({ occurredAt }) => occurredAt)).toEqual([
      new Date(2025, 11, 31, 12).getTime(),
      new Date(2026, 0, 2, 12).getTime(),
    ])
    expect(suggestions.map(({ amount }) => amount)).toEqual([50_000, 100_000])
  })
})

describe("catch-up amount validation", () => {
  it("only offers complete exact amounts from a mixed batch", () => {
    const suggestions = buildCatchUpSuggestions([
      "Pagaste $12,34,56 en SUBE",
      "Pagaste $1.234,56 en CARREFOUR",
      "Pagaste $90071992547409,93 en SUBE",
      "Cobraste USD 500 en ACME",
    ])
    const valid = suggestions.filter(isSuggestionValid)

    expect(suggestions).toHaveLength(4)
    expect(valid.map(({ amount, currency }) => ({ amount, currency }))).toEqual(
      [
        { amount: 123_456, currency: "ARS" },
        { amount: 50_000, currency: "USD" },
      ]
    )
  })
})

describe("catch-up from selected OCR text", () => {
  it("retains the adjacent receipt date through categorization and confirmation validation", () => {
    const text = selectTransactionText("Pagaste $500 en SUBE\n05/09/2026")
    const [suggestion] = buildCatchUpSuggestions(text ? [text] : [])

    expect(suggestion).toMatchObject({
      amount: 50_000,
      categoryId: "transport",
      currency: "ARS",
      merchant: "SUBE",
      occurredAt: new Date(2026, 8, 5, 12).getTime(),
    })
    expect(suggestion && isSuggestionValid(suggestion)).toBe(true)
  })
})

describe("catch-up amount currency", () => {
  it("keeps merchant currency-like names out of the currency selection", () => {
    const valid = buildCatchUpSuggestions([
      "Pagaste ARS $500 en USD STORE",
      "Pagaste $500 en USDT MARKET",
      "Cobraste USD $100 en ACME",
      "Cobraste $100 dólares en ACME",
    ]).filter(isSuggestionValid)

    expect(valid.map(({ amount, currency }) => ({ amount, currency }))).toEqual(
      [
        { amount: 50_000, currency: "ARS" },
        { amount: 50_000, currency: "ARS" },
        { amount: 10_000, currency: "USD" },
        { amount: 10_000, currency: "USD" },
      ]
    )
  })
})

describe("catch-up category phrase whitespace", () => {
  it("categorizes a pasted movement with nonbreaking spaces using legacy rules", () => {
    const [suggestion] = buildCatchUpSuggestions(
      ["Pagaste $500 en PET\u00a0SHOP"],
      1_700_000_000_000,
      [{ id: "pets", keywords: ["Pet\tShop"], name: "Mascotas" }]
    )
    expect(suggestion).toMatchObject({ amount: 50_000, categoryId: "pets" })
  })
})

describe("catch-up movement direction", () => {
  it("distinguishes paid fees from received fees in the same batch", () => {
    const suggestions = buildCatchUpSuggestions([
      "Pagaste $500 de honorarios",
      "Cobraste $500 de honorarios",
    ]).filter(isSuggestionValid)
    expect(suggestions.map(({ amount, kind }) => ({ amount, kind }))).toEqual([
      { amount: 50_000, kind: "expense" },
      { amount: 50_000, kind: "income" },
    ])
  })
})

describe("catch-up incomplete payments", () => {
  it("only offers completed movements from a mixed batch", () => {
    const suggestions = buildCatchUpSuggestions([
      "Pago rechazado $500 en SUBE",
      "Transferencia pendiente $1.000 en ACME",
      "Pago rechazado\n$500 en SUBE",
      "Pagaste $500 en SUBE",
      "Cobraste USD 100 en ACME",
    ])
    expect(suggestions).toHaveLength(5)
    expect(
      suggestions.slice(0, 3).every((item) => !isSuggestionValid(item))
    ).toBe(true)
    expect(suggestions.filter(isSuggestionValid)).toMatchObject([
      { amount: 50_000, merchant: "SUBE", kind: "expense" },
      { amount: 10_000, currency: "USD", merchant: "ACME", kind: "income" },
    ])
  })
})
