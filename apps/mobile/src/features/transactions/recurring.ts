import { normalizeText } from "./text"
import type { Currency, Transaction } from "./types"

export type RecurringCadence = "weekly" | "monthly"

export interface RecurringPayment {
  averageAmount: number
  cadence: RecurringCadence
  categoryId: string
  currency: Currency
  lastOccurredAt: number
  merchant: string
  occurrences: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_OCCURRENCES = 3
const MAX_AMOUNT_SPREAD = 0.25

interface CadenceWindow {
  cadence: RecurringCadence
  days: number
  toleranceDays: number
}

const CADENCE_WINDOWS: readonly CadenceWindow[] = [
  { cadence: "weekly", days: 7, toleranceDays: 2 },
  { cadence: "monthly", days: 30, toleranceDays: 5 },
]

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function detectCadence(intervals: readonly number[]): RecurringCadence | null {
  if (intervals.length === 0) {
    return null
  }

  for (const window of CADENCE_WINDOWS) {
    const withinWindow = intervals.every((interval) => {
      const days = interval / DAY_MS
      return Math.abs(days - window.days) <= window.toleranceDays
    })

    if (withinWindow) {
      return window.cadence
    }
  }

  return null
}

function hasStableAmount(amounts: readonly number[]): boolean {
  const middle = median(amounts)

  return (
    middle > 0 &&
    amounts.every(
      (amount) => Math.abs(amount - middle) <= middle * MAX_AMOUNT_SPREAD
    )
  )
}

function groupKey(transaction: Transaction): string | null {
  const merchant = transaction.merchant?.trim()

  return merchant ? `${transaction.currency}|${normalizeText(merchant)}` : null
}

// Detects subscriptions and regular bills: expenses to the same merchant, in the
// same currency, with a steady amount and a weekly or monthly rhythm.
export function detectRecurring(
  transactions: readonly Transaction[],
  minOccurrences = MIN_OCCURRENCES
): RecurringPayment[] {
  const groups = new Map<string, Transaction[]>()

  for (const transaction of transactions) {
    if (transaction.kind !== "expense") {
      continue
    }

    const key = groupKey(transaction)

    if (!key) {
      continue
    }

    const bucket = groups.get(key)
    if (bucket) {
      bucket.push(transaction)
    } else {
      groups.set(key, [transaction])
    }
  }

  const payments: RecurringPayment[] = []

  for (const bucket of groups.values()) {
    if (bucket.length < minOccurrences) {
      continue
    }

    const ordered = [...bucket].sort((a, b) => a.occurredAt - b.occurredAt)
    const intervals = ordered
      .slice(1)
      .map(
        (transaction, index) =>
          transaction.occurredAt - ordered[index].occurredAt
      )
    const amounts = ordered.map((transaction) => transaction.amount)
    const cadence = detectCadence(intervals)

    if (!(cadence && hasStableAmount(amounts))) {
      continue
    }

    const latest = ordered.at(-1)

    if (!latest) {
      continue
    }

    const total = amounts.reduce((sum, amount) => sum + amount, 0)

    payments.push({
      averageAmount: Math.round(total / amounts.length),
      cadence,
      categoryId: latest.categoryId,
      currency: latest.currency,
      lastOccurredAt: latest.occurredAt,
      merchant: latest.merchant ?? "",
      occurrences: ordered.length,
    })
  }

  return payments.sort((a, b) => b.lastOccurredAt - a.lastOccurredAt)
}
