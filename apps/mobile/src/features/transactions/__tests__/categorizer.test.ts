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

describe("category phrases with OCR whitespace", () => {
  const custom = { id: "pets", keywords: ["pet shop"], name: "Mascotas" }

  it.each([
    "PET  SHOP",
    "PET\tSHOP",
    "PET\nSHOP",
    "PET\r\nSHOP",
    "PET\u00a0SHOP",
    "PET\u202fSHOP",
  ])("matches the same phrase with whitespace in %s", (merchant) => {
    expect(categorize(`Pagaste $500 en ${merchant}`, [custom]).categoryId).toBe(
      "pets"
    )
  })

  it("matches rules saved with older noncanonical whitespace", () => {
    expect(
      categorize("Pagaste $500 en PET SHOP", [
        { ...custom, keywords: ["  Pet\t  Shop "] },
      ]).categoryId
    ).toBe("pets")
  })

  it("counts equivalent saved rules only once for confidence", () => {
    const single = categorize("Pagaste $500 en PET SHOP", [custom])
    const repeated = categorize("Pagaste $500 en PET SHOP", [
      { ...custom, keywords: ["pet shop", "PET  SHOP", "pet\nshop", ""] },
    ])
    expect(repeated).toEqual(single)
  })

  it.each(["PET SHOPPER", "CARPET SHOP", "PET, SHOP"])(
    "keeps phrase boundaries for %s",
    (merchant) => {
      expect(
        categorize(`Pagaste $500 en ${merchant}`, [custom]).categoryId
      ).toBe("uncategorized")
    }
  )

  it("preserves punctuation while normalizing accents and whitespace", () => {
    expect(normalizeText("  Café\t  del\nCentro,\u00a0Sur  ")).toBe(
      "cafe del centro, sur"
    )
  })
})
