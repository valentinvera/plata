import { describe, expect, it } from "bun:test"

import { selectTransactionText } from "../ocr"
import { parseTransactionText } from "../parser"

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

describe("adjacent OCR context", () => {
  it.each(["el 05/09/2026", "05/09/2026"])(
    "keeps a payment date printed on the next line: %s",
    (date) => {
      const selected = selectTransactionText(`Pagaste $500 en SUBE\n${date}`)
      expect(parseTransactionText(selected ?? "")).toMatchObject({
        amount: 50_000,
        merchant: "SUBE",
        occurredAt: new Date(2026, 8, 5, 12).getTime(),
      })
    }
  )

  it("keeps a merchant printed below the amount", () => {
    const selected = selectTransactionText("Pagaste $500\nen SUBE")
    expect(parseTransactionText(selected ?? "")).toMatchObject({
      amount: 50_000,
      merchant: "SUBE",
    })
  })

  it("keeps a date printed above the payment", () => {
    const selected = selectTransactionText("05/09/2026\nPagaste $500 en SUBE")
    expect(parseTransactionText(selected ?? "")).toMatchObject({
      amount: 50_000,
      merchant: "SUBE",
      occurredAt: new Date(2026, 8, 5, 12).getTime(),
    })
  })

  it("does not append an unrelated footer to a complete payment", () => {
    expect(
      selectTransactionText("Pagaste $500 en SUBE\nGracias por operar")
    ).toBe("Pagaste $500 en SUBE")
  })

  it("never combines two complete payments to borrow the second date or currency", () => {
    const selected = selectTransactionText(
      "Pagaste $500 en SUBE\nCobraste USD 100 en ACME el 05/09/2026"
    )
    expect(selected).toBe("Cobraste USD 100 en ACME el 05/09/2026")
    expect(parseTransactionText(selected ?? "")).toMatchObject({
      amount: 10_000,
      currency: "USD",
      kind: "income",
      merchant: "ACME",
      occurredAt: new Date(2026, 8, 5, 12).getTime(),
    })
  })

  it("does not merge adjacent amounts even without payment verbs", () => {
    expect(selectTransactionText("$500 en SUBE\n$200 el 05/09/2026")).toBe(
      "$500 en SUBE"
    )
  })

  it("does not join two payment labels across a missing amount", () => {
    expect(
      selectTransactionText("Compra pendiente\nCobraste $100 en ACME")
    ).toBe("Cobraste $100 en ACME")
  })

  it("still excludes balances and limits beside a dated payment", () => {
    const selected = selectTransactionText(
      "Saldo USD $50.000\nPagaste $500 en SUBE\nel 05/09/2026\nLímite de compra $80.000"
    )
    expect(parseTransactionText(selected ?? "")).toMatchObject({
      amount: 50_000,
      currency: "ARS",
      merchant: "SUBE",
      occurredAt: new Date(2026, 8, 5, 12).getTime(),
    })
  })
})

describe("incomplete OCR payments", () => {
  it.each([
    "Pago rechazado $500 en SUBE",
    "Compra cancelada $500 en SUBE",
    "Transferencia pendiente $1.000 en ACME",
    "Pago en proceso $500 en SUBE",
    "Transferencia programada $1.000 en ACME",
    "No se pudo realizar el pago de $500 en SUBE",
    "Pago rechazado\n$500 en SUBE",
    "Transferencia\npendiente\n$1.000 en ACME",
  ])("does not select an incomplete payment: %s", (text) => {
    expect(selectTransactionText(text)).toBeNull()
  })

  it("keeps a separate completed payment after an incomplete one", () => {
    expect(
      selectTransactionText(
        "Pago rechazado\n$500 en SUBE\nCobraste $100 en ACME"
      )
    ).toBe("Cobraste $100 en ACME")
  })

  it.each(["Pago Pendiente", "Compra Cancelada"])(
    "keeps a merchant whose name resembles a status: %s",
    (merchant) => {
      expect(selectTransactionText(`Pagaste $500 en ${merchant}`)).toBe(
        `Pagaste $500 en ${merchant}`
      )
    }
  )
})
