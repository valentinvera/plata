import { DEFAULT_CATEGORIES } from "./categories"
import { categorize } from "./categorizer"
import { parseTransactionText } from "./parser"
import { containsKeyword, normalizeText } from "./text"
import type { Category, NewTransaction } from "./types"

export interface NotificationPayload {
  app: string
  bigText: string
  text: string
  time: string
  title: string
}

// Notifications come from every app, so only texts that read like a payment are
// turned into suggestions (avoids chat messages or promotions with a "$ amount").
const TRANSACTION_SIGNALS = [
  "abonaste",
  "acreditaron",
  "cobraste",
  "compra",
  "compraste",
  "consumo",
  "cuota",
  "debito",
  "ingreso",
  "pagaste",
  "pago",
  "recibiste",
  "suscripcion",
  "transferencia",
  "transferiste",
]

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

export function hasTransactionSignal(text: string): boolean {
  const normalized = normalizeText(text)
  return TRANSACTION_SIGNALS.some((signal) =>
    containsKeyword(normalized, signal)
  )
}

function notificationTimestamp(payload: NotificationPayload): number | null {
  const value = Number(payload.time)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function notificationTransactionId(
  payload: NotificationPayload
): string {
  const key = `${payload.app}|${payload.time}|${notificationText(payload)}`
  let hash = 0

  for (const character of key) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 2_147_483_647
  }

  return `notif-${hash.toString(16)}`
}

export function buildNotificationTransaction(
  payload: NotificationPayload,
  now: number = Date.now(),
  categories: readonly Category[] = DEFAULT_CATEGORIES
): NewTransaction | null {
  const text = notificationText(payload)

  if (!(text && hasTransactionSignal(text))) {
    return null
  }

  const parsed = parseTransactionText(text, now)

  if (parsed.amount === null || parsed.amount <= 0) {
    return null
  }

  const categorization = categorize(
    `${text} ${parsed.merchant ?? ""}`,
    categories
  )

  return {
    accountId: null,
    amount: parsed.amount,
    categoryId: categorization.categoryId,
    confidence: categorization.confidence,
    currency: parsed.currency,
    kind: parsed.kind,
    merchant: parsed.merchant,
    note: null,
    occurredAt: parsed.occurredAt ?? notificationTimestamp(payload) ?? now,
    rawRef: text,
    source: "notification",
    state: "suggested",
  }
}
