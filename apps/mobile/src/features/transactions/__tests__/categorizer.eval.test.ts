import { describe, expect, it } from "bun:test"

import { categorize } from "../categorizer"
import { CATEGORIZATION_DATASET } from "./categorization-dataset"

describe("categorization eval", () => {
  it("reaches at least 90% accuracy on the labeled dataset", () => {
    const correct = CATEGORIZATION_DATASET.filter(
      (example) => categorize(example.text).categoryId === example.categoryId
    ).length
    const accuracy = correct / CATEGORIZATION_DATASET.length

    expect(accuracy).toBeGreaterThanOrEqual(0.9)
  })
})
