import { describe, expect, it } from "bun:test"

import { categorize } from "../categorizer"
import { normalizeText } from "../text"

describe("normalizeText", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeText("  Café Ñandú ")).toBe("cafe nandu")
  })
})

describe("categorize", () => {
  it("matches a category by keyword", () => {
    expect(categorize("Compraste en CARREFOUR").categoryId).toBe("groceries")
  })

  it("returns uncategorized with zero confidence when nothing matches", () => {
    expect(categorize("asdf qwerty")).toEqual({
      categoryId: "uncategorized",
      confidence: 0,
    })
  })

  it("does not match keywords inside larger words", () => {
    // "bar" is a food keyword; "barrio" must not match it.
    expect(categorize("Pago en el barrio").categoryId).toBe("uncategorized")
  })

  it("raises confidence with more keyword matches", () => {
    const single = categorize("Comision $1.000").confidence
    const multiple = categorize("Comision mantenimiento $1.000").confidence
    expect(multiple).toBeGreaterThan(single)
  })
})
