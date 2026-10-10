import { describe, expect, it } from "bun:test"

import {
  buildNotificationTransaction,
  notificationText,
  parseNotificationPayload,
} from "../notification"

const raw = JSON.stringify({
  app: "com.bank",
  bigText: "",
  text: "Compraste $12.345,67 en CARREFOUR el 05/09",
  time: "1700000000000",
  title: "Compra",
})

describe("parseNotificationPayload", () => {
  it("parses the JSON string into the known fields", () => {
    expect(parseNotificationPayload(raw)).toEqual({
      app: "com.bank",
      bigText: "",
      text: "Compraste $12.345,67 en CARREFOUR el 05/09",
      time: "1700000000000",
      title: "Compra",
    })
  })

  it("returns null for invalid JSON or non-objects", () => {
    expect(parseNotificationPayload("not json")).toBeNull()
    expect(parseNotificationPayload("42")).toBeNull()
    expect(parseNotificationPayload("null")).toBeNull()
  })

  it("defaults missing fields to empty strings", () => {
    expect(parseNotificationPayload("{}")).toEqual({
      app: "",
      bigText: "",
      text: "",
      time: "",
      title: "",
    })
  })
})

describe("notificationText", () => {
  it("joins the title and the body", () => {
    expect(
      notificationText({
        app: "",
        bigText: "",
        text: "Compraste $10 en CARREFOUR",
        time: "",
        title: "Compra",
      })
    ).toBe("Compra Compraste $10 en CARREFOUR")
  })

  it("prefers the expanded body when present", () => {
    expect(
      notificationText({
        app: "",
        bigText: "Compraste $10 en CARREFOUR",
        text: "Compraste $10",
        time: "",
        title: "",
      })
    ).toBe("Compraste $10 en CARREFOUR")
  })
})

describe("buildNotificationTransaction", () => {
  it("builds a suggested notification transaction from a parsed amount", () => {
    const payload = parseNotificationPayload(raw)
    const transaction = payload ? buildNotificationTransaction(payload) : null

    expect(transaction).not.toBeNull()
    expect(transaction?.amount).toBe(1_234_567)
    expect(transaction?.merchant).toBe("CARREFOUR")
    expect(transaction?.categoryId).toBe("groceries")
    expect(transaction?.source).toBe("notification")
    expect(transaction?.state).toBe("suggested")
    expect(transaction?.accountId).toBeNull()
  })

  it("returns null when no amount can be parsed", () => {
    expect(
      buildNotificationTransaction({
        app: "",
        bigText: "",
        text: "Hola, ¿cómo estás?",
        time: "",
        title: "Mensaje",
      })
    ).toBeNull()
  })

  it("returns null when there is no text at all", () => {
    expect(
      buildNotificationTransaction({
        app: "",
        bigText: "",
        text: "",
        time: "",
        title: "",
      })
    ).toBeNull()
  })
})
