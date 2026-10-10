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

  it("falls back to any line with an amount", () => {
    const ocr = ["Encabezado", "$12.345,67", "Pie"].join("\n")

    expect(selectTransactionText(ocr)).toBe("$12.345,67")
  })

  it("falls back to the first non-empty line", () => {
    expect(selectTransactionText("\n  Hola  \n")).toBe("Hola")
  })

  it("returns null for blank text", () => {
    expect(selectTransactionText("   \n  ")).toBeNull()
  })
})
