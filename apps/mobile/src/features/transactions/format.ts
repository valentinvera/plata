import type { DateRange } from "./periods"
import type { Currency } from "./types"

const formatters = new Map<Currency, Intl.NumberFormat>()

function amountFormatter(currency: Currency): Intl.NumberFormat {
  const cached = formatters.get(currency)
  if (cached) {
    return cached
  }

  const formatter = new Intl.NumberFormat("es-AR", {
    currency,
    style: "currency",
  })
  formatters.set(currency, formatter)
  return formatter
}

export function formatAmount(cents: number, currency: Currency): string {
  return amountFormatter(currency).format(cents / 100)
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
})

const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long" })

export function formatDay(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp))
}

// "Octubre": sentence case for the home header.
export function formatMonth(timestamp: number): string {
  const month = monthFormatter.format(new Date(timestamp))
  return month.charAt(0).toUpperCase() + month.slice(1)
}

export function formatDateRange(range: DateRange): string {
  return `${formatDay(range.start)} – ${formatDay(range.end - 1)}`
}

export function formatAmountInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",")
}

const AMOUNT_INPUT_REGEX =
  /^(?:\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)$/

export function parseAmountInput(value: string): number | null {
  const trimmed = value.trim()

  if (!AMOUNT_INPUT_REGEX.test(trimmed)) {
    return null
  }

  const digits = trimmed.replace(/\./g, "")
  const [whole, fraction = ""] = digits.split(",")
  const cents = Number(`${whole}${fraction.padEnd(2, "0")}`)

  return Number.isSafeInteger(cents) ? cents : null
}

export function formatDateInput(timestamp: number): string {
  const date = new Date(timestamp)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear()).padStart(4, "0")
  return `${day}/${month}/${year}`
}

const DATE_INPUT_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

// Date-only corrections use local noon, like imported transaction dates. Keep
// the exact original time when the user saves without changing the calendar day.
export function parseDateInput(
  value: string,
  originalTimestamp?: number
): number | null {
  const match = value.trim().match(DATE_INPUT_REGEX)
  if (!match) {
    return null
  }
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  const date = new Date(0)
  date.setHours(12, 0, 0, 0)
  date.setFullYear(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  if (
    originalTimestamp !== undefined &&
    formatDateInput(originalTimestamp) === formatDateInput(date.getTime())
  ) {
    return originalTimestamp
  }
  return date.getTime()
}
