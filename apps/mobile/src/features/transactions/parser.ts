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

// Leap-day occurrences can be eight years apart around a non-leap century.
const MAX_DATE_YEAR_LOOKBACK = 8

const DATE_REGEX = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/
const MERCHANT_REGEX = /\ben\s+(.+?)(?=\s+(?:el|del|por)\s+(?:\d|\$)|\s+\$|$)/i
const CURRENCY_AMOUNT_REGEX =
  /(\b(?:ARS|USD|d[oó]lares|pesos)\b\s*\$?|\b(?:u\$s|us\$)|\$)\s*(\d\S*)/i
const ADJACENT_CURRENCY_SUFFIX =
  /^\s+(USD\b|ARS\b|u\$s\b|us\$|d[oó]lares\b|pesos\b)/i
const USD_MARKER = /^(?:usd\b|u\$s|us\$|dolares\b)/
const PLAIN_AMOUNT_REGEX = /\b(\d[\d.,]*[.,]\d[\d.,]*)(?![\w.,])/
const CURRENCY_PREFIX = /^(?:ARS|USD|u\$s|us\$|\$)\s*/i
const CURRENCY_SUFFIX = /\s*(?:ARS|USD|u\$s|us\$|\$)$/i
const ARGENTINE_AMOUNT_REGEX = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/
const INTERNATIONAL_AMOUNT_REGEX = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/
const TRAILING_AMOUNT_PUNCTUATION = /[.,;:!?)-]+$/

export function parseAmountToCents(raw: string): number | null {
  const value = raw
    .trim()
    .replace(CURRENCY_PREFIX, "")
    .replace(CURRENCY_SUFFIX, "")
    .trim()
  const isArgentine = ARGENTINE_AMOUNT_REGEX.test(value)
  if (!(isArgentine || INTERNATIONAL_AMOUNT_REGEX.test(value))) {
    return null
  }

  const ungrouped = isArgentine
    ? value.replace(/\./g, "")
    : value.replace(/,/g, "")
  const [whole, fraction = ""] = ungrouped.split(isArgentine ? "," : ".")
  // Build integer cents directly: multiplying a parsed decimal can round away
  // centavos, and parseFloat would silently accept malformed numeric prefixes.
  const cents = Number(`${whole}${fraction.padEnd(2, "0")}`)
  return Number.isSafeInteger(cents) ? cents : null
}

interface ExtractedAmount {
  currency: Currency
  token: string
}

function amountCurrency(prefix: string | undefined, suffix: string): Currency {
  // An explicit prefix belongs to this amount and wins over other currency
  // mentions. A generic "$" or an unmarked decimal can use an adjacent suffix.
  const marker =
    prefix && prefix.trim() !== "$"
      ? prefix
      : (suffix.match(ADJACENT_CURRENCY_SUFFIX)?.[1] ?? "")
  return USD_MARKER.test(normalizeText(marker)) ? "USD" : "ARS"
}

function extractAmount(text: string): ExtractedAmount | null {
  const prefixed = text.match(CURRENCY_AMOUNT_REGEX)
  const match = prefixed ?? text.match(PLAIN_AMOUNT_REGEX)
  const token = prefixed ? prefixed[2] : match?.[1]
  if (!(match && token)) {
    return null
  }

  // Sentence punctuation ends the amount's context: a following USD balance
  // must not become a currency suffix for the payment that just ended.
  const cleanToken = token.replace(TRAILING_AMOUNT_PUNCTUATION, "")
  const suffix =
    cleanToken === token ? text.slice((match.index ?? 0) + match[0].length) : ""
  return {
    currency: amountCurrency(prefixed?.[1], suffix),
    // Keep malformed grouping intact so it cannot become a valid prefix.
    token: cleanToken,
  }
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

  const reference = new Date(now)
  const rawYear = match?.[3]
  let year = resolveYear(rawYear, reference.getFullYear())
  if (
    rawYear === undefined &&
    (month > reference.getMonth() + 1 ||
      (month === reference.getMonth() + 1 && day > reference.getDate()))
  ) {
    year -= 1
  }

  // Yearless imports describe past movements. Compare calendar days, not the
  // noon placeholder against the clock, so today's morning import stays today.
  const lookback = rawYear === undefined ? MAX_DATE_YEAR_LOOKBACK : 0
  for (let yearsAgo = 0; yearsAgo <= lookback; yearsAgo += 1) {
    const candidateYear = year - yearsAgo
    const date = new Date(candidateYear, month - 1, day, 12)
    if (
      date.getFullYear() === candidateYear &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date.getTime()
    }
  }

  // Never roll an impossible date (31/02) or an invalid explicit year forward.
  return null
}

export function parseTransactionText(
  text: string,
  now: number = Date.now()
): ParsedTransaction {
  const normalized = normalizeText(text)
  const extracted = extractAmount(text)

  return {
    amount: extracted ? parseAmountToCents(extracted.token) : null,
    currency: extracted?.currency ?? "ARS",
    kind: detectKind(normalized),
    merchant: detectMerchant(text),
    occurredAt: parseDate(text, now),
  }
}
