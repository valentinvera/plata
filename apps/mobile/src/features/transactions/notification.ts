import { categorize } from "./categorizer"
import { parseTransactionText } from "./parser"
import type { NewTransaction } from "./types"

export interface NotificationPayload {
  app: string
  bigText: string
  text: string
  time: string
  title: string
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export function parseNotificationPayload(
  raw: string
): NotificationPayload | null {
  let value: unknown

  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof value !== "object" || value === null) {
    return null
  }

  const record = value as Record<string, unknown>

  return {
    app: stringField(record.app),
    bigText: stringField(record.bigText),
    text: stringField(record.text),
    time: stringField(record.time),
    title: stringField(record.title),
  }
}

export function notificationText(payload: NotificationPayload): string {
  return [payload.title, payload.bigText || payload.text]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ")
    .trim()
}

export function buildNotificationTransaction(
  payload: NotificationPayload,
  now: number = Date.now()
): NewTransaction | null {
  const text = notificationText(payload)

  if (!text) {
    return null
  }

  const parsed = parseTransactionText(text, now)

  if (parsed.amount === null || parsed.amount <= 0) {
    return null
  }

  const categorization = categorize(`${text} ${parsed.merchant ?? ""}`)

  return {
    accountId: null,
    amount: parsed.amount,
    categoryId: categorization.categoryId,
    confidence: categorization.confidence,
    currency: parsed.currency,
    kind: parsed.kind,
    merchant: parsed.merchant,
    note: null,
    occurredAt: parsed.occurredAt ?? now,
    rawRef: text,
    source: "notification",
    state: "suggested",
  }
}
