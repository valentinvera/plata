import { createId } from "./id"
import type { DateRange } from "./periods"
import { detectRecurring, type RecurringCadence } from "./recurring"
import { normalizeText } from "./text"
import type { Currency, Transaction } from "./types"

const DAY_MS = 24 * 60 * 60 * 1000
const NEAR_DAYS = 5
const DEFAULT_MISSING_DAYS = 30

const CADENCE_DAYS: Record<RecurringCadence, number> = {
  monthly: 30,
  weekly: 7,
}

export interface RecurringSuggestion {
  amount: number
  categoryId: string
  currency: Currency
  id: string
  merchant: string
  occurredAt: number
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
  merchant: string,
  currency: Currency,
  due: number
): boolean {
  const key = normalizeText(merchant)

  return transactions.some(
    (transaction) =>
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
    const step = CADENCE_DAYS[payment.cadence] * DAY_MS
    let due = payment.lastOccurredAt + step

    while (due < range.end) {
      if (
        due >= range.start &&
        !hasNearby(transactions, payment.merchant, payment.currency, due)
      ) {
        suggestions.push({
          amount: payment.averageAmount,
          categoryId: payment.categoryId,
          currency: payment.currency,
          id: createId(),
          merchant: payment.merchant,
          occurredAt: due,
        })
      }

      due += step
    }
  }

  return suggestions.sort((a, b) => a.occurredAt - b.occurredAt)
}
