import { describe, expect, it } from "bun:test"

import {
  DEFAULT_CATEGORIES,
  getCategoryById,
  normalizeCategoryKeywords,
  parseCategoryKeywords,
  validateCategoryName,
} from "../categories"
import { categorize } from "../categorizer"
import type { Category } from "../types"

describe("normalizeCategoryKeywords", () => {
  it("normalizes, dedupes and drops blanks", () => {
    expect(
      normalizeCategoryKeywords(["  Café ", "CAFE", "", "  ", "Ñandú"])
    ).toEqual(["cafe", "nandu"])
  })
})

describe("parseCategoryKeywords", () => {
  it("splits a comma separated value", () => {
    expect(parseCategoryKeywords("Café, bar ,,")).toEqual(["cafe", "bar"])
  })
})

describe("validateCategoryName", () => {
  it("rejects an empty name", () => {
    expect(validateCategoryName("   ", DEFAULT_CATEGORIES)).toBe("Enter a name")
  })

  it("rejects a duplicate of an existing category", () => {
    expect(validateCategoryName("Comida", DEFAULT_CATEGORIES)).toBe(
      "A category with that name already exists"
    )
  })

  it("allows an unchanged name while editing", () => {
    const food = getCategoryById("food")

    expect(
      validateCategoryName(food.name, DEFAULT_CATEGORIES, food.id)
    ).toBeNull()
  })

  it("allows a new name", () => {
    expect(validateCategoryName("Mascotas", DEFAULT_CATEGORIES)).toBeNull()
  })
})

describe("categorize with custom categories", () => {
  const custom: Category = {
    id: "pets",
    keywords: ["veterinaria"],
    name: "Mascotas",
  }

  it("matches a custom category", () => {
    expect(
      categorize("Pago en la veterinaria", [...DEFAULT_CATEGORIES, custom])
        .categoryId
    ).toBe("pets")
  })

  it("lets a custom category win a keyword tie with a built-in", () => {
    const work: Category = {
      id: "work",
      keywords: ["uber"],
      name: "Trabajo",
    }

    expect(
      categorize("Viaje uber", [work, ...DEFAULT_CATEGORIES]).categoryId
    ).toBe("work")
  })
})

describe("stored phrase normalization", () => {
  it("deduplicates equivalent whitespace before saving rules", () => {
    expect(
      normalizeCategoryKeywords([
        "Pet Shop",
        " pet  shop ",
        "PET\nSHOP",
        "pet\u00a0shop",
        "\t\n",
      ])
    ).toEqual(["pet shop"])
  })
})
