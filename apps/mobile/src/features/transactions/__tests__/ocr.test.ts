import { describe, expect, it } from "bun:test"

import { selectTransactionText } from "../ocr"

describe("selectTransactionText", () => {
  it("picks the line that reads like a payment", () => {
    const ocr = [
      "Banco X",
      "Saldo $ 50.000,00",
      "Compraste $12.345,67 en CARREFOUR",
      "Gracias por operar",
    ].join("\n")

    expect(selectTransactionText(ocr)).toBe("Compraste $12.345,67 en CARREFOUR")
  })

  it("picks the transaction when the label and amount are on separate lines", () => {
    const ocr = ["Saldo $50.000", "Compraste en CARREFOUR", "$12.345,67"].join(
      "\n"
    )

    expect(selectTransactionText(ocr)).toBe("Compraste en CARREFOUR $12.345,67")
  })

  it("returns null when nothing looks like a payment", () => {
    expect(selectTransactionText("\n  Hola  \n  mundo  \n")).toBeNull()
  })

  it("returns null for a screenshot that is not a transaction", () => {
    const ocr = [
      "2:59",
      "Wed, Oct 14",
      "Gmail",
      "Photos",
      "YouTube",
      "Serial console enabled",
    ].join("\n")

    expect(selectTransactionText(ocr)).toBeNull()
  })

  it("returns null for blank text", () => {
    expect(selectTransactionText("   \n  ")).toBeNull()
  })
})
