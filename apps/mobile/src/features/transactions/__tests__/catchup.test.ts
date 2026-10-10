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
