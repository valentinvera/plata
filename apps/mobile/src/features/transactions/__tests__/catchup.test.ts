import { describe, expect, it } from "bun:test"

import {
  buildCatchUpSuggestions,
  isSuggestionValid,
  splitCatchUpTexts,
} from "../catchup"

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
