import { createId } from "./id"
import type { DateRange } from "./periods"
import { detectRecurring, type RecurringCadence } from "./recurring"
import { normalizeText } from "./text"
import type { Currency, Transaction } from "./types"

const DAY_MS = 24 * 60 * 60 * 1000
const DAYS_PER_WEEK = 7
const NEAR_DAYS = 5
const DEFAULT_MISSING_DAYS = 30

export interface RecurringSuggestion {
  accountId: string | null
  amount: number
  categoryId: string
  currency: Currency
  id: string
  merchant: string
  occurredAt: number
}

// Advances by calendar month (clamping the day) or a fixed week, so a same-day
// monthly series does not drift (Jan 15 -> Feb 15 -> Mar 15).
function advance(timestamp: number, cadence: RecurringCadence): number {
  if (cadence !== "monthly") {
    return timestamp + DAYS_PER_WEEK * DAY_MS
  }

  const date = new Date(timestamp)
  const day = date.getDate()

  date.setDate(1)
  date.setMonth(date.getMonth() + 1)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))

  return date.getTime()
}

// The period the user has not recorded yet: from the latest transaction to now
// (or the last 30 days when there is no history).
export function missingRange(
  transactions: readonly Transaction[],
  now: number
): DateRange {
  let latest = 0

  for (const transaction of transactions) {
    if (transaction.occurredAt > latest) {
      latest = transaction.occurredAt
    }
  }

  return {
    end: now,
    start: latest > 0 ? latest : now - DEFAULT_MISSING_DAYS * DAY_MS,
  }
}

function hasNearby(
  transactions: readonly Transaction[],
  accountId: string | null,
  merchant: string,
  currency: Currency,
  due: number
): boolean {
  const key = normalizeText(merchant)

  return transactions.some(
    (transaction) =>
      transaction.accountId === accountId &&
      transaction.currency === currency &&
      transaction.merchant !== null &&
      normalizeText(transaction.merchant) === key &&
      Math.abs(transaction.occurredAt - due) <= NEAR_DAYS * DAY_MS
  )
}

// Projects each recurring payment into the missing period, skipping dates that
// already have a matching transaction.
export function suggestRecurringTransactions(
  transactions: readonly Transaction[],
  now: number = Date.now()
): RecurringSuggestion[] {
  const range = missingRange(transactions, now)
  const suggestions: RecurringSuggestion[] = []

  for (const payment of detectRecurring(transactions)) {
    let due = advance(payment.lastOccurredAt, payment.cadence)

    while (due < range.end) {
      if (
        due >= range.start &&
        !hasNearby(
          transactions,
          payment.accountId,
          payment.merchant,
          payment.currency,
          due
        )
      ) {
        suggestions.push({
          accountId: payment.accountId,
          amount: payment.averageAmount,
          categoryId: payment.categoryId,
          currency: payment.currency,
          id: createId(),
          merchant: payment.merchant,
          occurredAt: due,
        })
      }

      due = advance(due, payment.cadence)
    }
  }

  return suggestions.sort((a, b) => a.occurredAt - b.occurredAt)
}
