import { describe, expect, it } from "bun:test"

import {
  buildNotificationTransaction,
  hasTransactionSignal,
  notificationText,
  notificationTransactionId,
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

describe("hasTransactionSignal", () => {
  it("detects payment verbs", () => {
    expect(hasTransactionSignal("Compraste $10 en CARREFOUR")).toBe(true)
    expect(hasTransactionSignal("Pagaste $4.500")).toBe(true)
    expect(hasTransactionSignal("Transferiste $1.000")).toBe(true)
  })

  it("ignores unrelated texts", () => {
    expect(hasTransactionSignal("Send me $500")).toBe(false)
    expect(hasTransactionSignal("Hola, ¿cómo estás?")).toBe(false)
  })
})

describe("notificationTransactionId", () => {
  const payload = {
    app: "com.bank",
    bigText: "",
    text: "Compraste $10 en CARREFOUR",
    time: "1700000000000",
    title: "",
  }

  it("is stable for the same notification", () => {
    expect(notificationTransactionId(payload)).toBe(
      notificationTransactionId({ ...payload })
    )
  })

  it("differs when the source notification differs", () => {
    expect(notificationTransactionId(payload)).not.toBe(
      notificationTransactionId({ ...payload, time: "1700000000001" })
    )
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

  it("uses the notification timestamp when the text has no date", () => {
    const transaction = buildNotificationTransaction({
      app: "com.bank",
      bigText: "",
      text: "Compraste $10 en CARREFOUR",
      time: "1700000000000",
      title: "",
    })

    expect(transaction?.occurredAt).toBe(1_700_000_000_000)
  })

  it("ignores amounts that are not a payment", () => {
    expect(
      buildNotificationTransaction({
        app: "com.whatsapp",
        bigText: "",
        text: "Send me $500",
        time: "",
        title: "",
      })
    ).toBeNull()
  })

  it("returns null when no amount can be parsed", () => {
    expect(
      buildNotificationTransaction({
        app: "com.bank",
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

describe("captured notification dates", () => {
  const now = new Date(2026, 0, 5, 9).getTime()
  const captured = new Date(2024, 8, 6, 18, 30).getTime()
  const payload = {
    app: "com.bank",
    bigText: "",
    text: "Pagaste $500 en SUBE el 05/09",
    time: String(captured),
    title: "Pago",
  }

  it("resolves an omitted year against capture time rather than delayed processing", () => {
    expect(buildNotificationTransaction(payload, now)?.occurredAt).toBe(
      new Date(2024, 8, 5, 12).getTime()
    )
  })

  it("resolves December against a notification captured in January", () => {
    expect(
      buildNotificationTransaction(
        {
          ...payload,
          time: String(now),
          text: "Pagaste $500 en SUBE el 31/12",
        },
        now
      )?.occurredAt
    ).toBe(new Date(2025, 11, 31, 12).getTime())
  })

  it.each(["", "invalid", "-1", "Infinity", "1e100", "1.5"])(
    "falls back to processing time for an invalid capture time: %s",
    (time) => {
      expect(
        buildNotificationTransaction(
          {
            ...payload,
            time,
            text: "Pagaste $500 en SUBE el 31/12",
          },
          now
        )?.occurredAt
      ).toBe(new Date(2025, 11, 31, 12).getTime())
    }
  )

  it("preserves an explicit year regardless of capture and processing time", () => {
    expect(
      buildNotificationTransaction(
        {
          ...payload,
          text: "Pagaste $500 en SUBE el 05/09/2023",
        },
        now
      )?.occurredAt
    ).toBe(new Date(2023, 8, 5, 12).getTime())
  })
})

describe("notification amount validation", () => {
  const payload = {
    app: "com.bank",
    bigText: "",
    text: "",
    time: "1700000000000",
    title: "Pago",
  }

  it.each(["$12,34,56", "$12.34.56", "$90071992547409,93"])(
    "does not create a suggestion for %s",
    (amount) => {
      expect(
        buildNotificationTransaction({
          ...payload,
          text: `Pagaste ${amount} en SUBE`,
        })
      ).toBeNull()
    }
  )

  it("imports an integer USD amount without requiring a dollar symbol", () => {
    expect(
      buildNotificationTransaction({
        ...payload,
        text: "Cobraste USD 500 en ACME",
      })
    ).toMatchObject({
      amount: 50_000,
      currency: "USD",
      kind: "income",
    })
  })
})
