import { containsKeyword, normalizeText } from "./text"
import type { Currency, ParsedTransaction, TransactionKind } from "./types"

const INCOME_KEYWORDS = [
  "acreditaron",
  "cobraste",
  "haberes",
  "honorarios",
  "ingreso",
  "recibiste",
  "sueldo",
]

const USD_KEYWORDS = ["dolares", "usd", "u$s", "us$"]

const DATE_REGEX = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/
const MERCHANT_REGEX = /\ben\s+(.+?)(?=\s+(?:el|del|por)\s+(?:\d|\$)|\s+\$|$)/i
const CURRENCY_AMOUNT_REGEX = /(?:\$|u\$s|us\$)\s*(\d[\d.,]*)/i
const PLAIN_AMOUNT_REGEX =
  /\b(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{1,2}|\d+\.\d{1,2})\b/
const NON_AMOUNT_CHARS = /[^\d.,]/g
const TRAILING_THOUSANDS = /\.\d{3}$/

export function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.replace(NON_AMOUNT_CHARS, "")

  if (!cleaned) {
    return null
  }

  const hasComma = cleaned.includes(",")
  const hasDot = cleaned.includes(".")
  let normalized = cleaned

  if (hasComma && hasDot) {
    normalized =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "")
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".")
  } else if (hasDot && TRAILING_THOUSANDS.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "")
  }

  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? Math.round(value * 100) : null
}

function extractAmountToken(text: string): string | null {
  const withCurrency = text.match(CURRENCY_AMOUNT_REGEX)?.[1]
  if (withCurrency) {
    return withCurrency
  }

  return text.match(PLAIN_AMOUNT_REGEX)?.[1] ?? null
}

function detectCurrency(normalized: string): Currency {
  return USD_KEYWORDS.some((keyword) => normalized.includes(keyword))
    ? "USD"
    : "ARS"
}

function detectKind(normalized: string): TransactionKind {
  return INCOME_KEYWORDS.some((keyword) => containsKeyword(normalized, keyword))
    ? "income"
    : "expense"
}

function detectMerchant(text: string): string | null {
  const candidate = text.match(MERCHANT_REGEX)?.[1]?.trim()
  return candidate ? candidate.replace(/\s+/g, " ") : null
}

function resolveYear(rawYear: string | undefined, currentYear: number): number {
  if (!rawYear) {
    return currentYear
  }

  const value = Number(rawYear)
  return rawYear.length === 2 ? 2000 + value : value
}

function parseDate(text: string, now: number): number | null {
  const match = text.match(DATE_REGEX)
  const dayText = match?.[1]
  const monthText = match?.[2]

  if (!(dayText && monthText)) {
    return null
  }

  const day = Number(dayText)
  const month = Number(monthText)

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  const year = resolveYear(match?.[3], new Date(now).getFullYear())
  const date = new Date(year, month - 1, day, 12)

  // Reject dates that overflow into another day (e.g. 31/02 -> Mar 3).
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date.getTime()
}

export function parseTransactionText(
  text: string,
  now: number = Date.now()
): ParsedTransaction {
  const normalized = normalizeText(text)
  const amountToken = extractAmountToken(text)

  return {
    amount: amountToken ? parseAmountToCents(amountToken) : null,
    currency: detectCurrency(normalized),
    kind: detectKind(normalized),
    merchant: detectMerchant(text),
    occurredAt: parseDate(text, now),
  }
}
