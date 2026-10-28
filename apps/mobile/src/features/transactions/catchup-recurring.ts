import { createId } from "./id"
import { detectRecurring, type RecurringPayment } from "./recurring"
import { normalizeText } from "./text"
import type { Currency, Transaction } from "./types"

const DAY_MS = 24 * 60 * 60 * 1000
const DAYS_PER_WEEK = 7
const NEAR_DAYS = 5

export interface RecurringSuggestion {
  accountId: string | null
  amount: number
  categoryId: string
  currency: Currency
  id: string
  merchant: string
  occurredAt: number
}

// Calculate each occurrence from the original date, so clamping January 31
// to February 28 does not move the March occurrence to the 28th as well.
function occurrenceAt(
  payment: RecurringPayment,
  offset: number,
  day: number
): number {
  const date = new Date(payment.lastOccurredAt)
  if (payment.cadence === "weekly") {
    date.setDate(date.getDate() + DAYS_PER_WEEK * offset)
    return date.getTime()
  }

  date.setDate(1)
  date.setMonth(date.getMonth() + offset)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return date.getTime()
}

function matchesSeries(
  transaction: Transaction,
  payment: RecurringPayment
): boolean {
  return (
    transaction.kind === "expense" &&
    transaction.accountId === payment.accountId &&
    transaction.currency === payment.currency &&
    transaction.merchant !== null &&
    normalizeText(transaction.merchant) === normalizeText(payment.merchant)
  )
}

function monthlyDay(
  payment: RecurringPayment,
  confirmed: readonly Transaction[]
): number {
  const latest = new Date(payment.lastOccurredAt)
  const day = latest.getDate()
  const lastDay = new Date(
    latest.getFullYear(),
    latest.getMonth() + 1,
    0
  ).getDate()
  if (payment.cadence !== "monthly" || day !== lastDay) {
    return day
  }

  // A confirmed payment on the last day of a short month can be a clamped
  // occurrence. Recover its billing day from the same confirmed series.
  return confirmed.reduce(
    (billingDay, transaction) =>
      matchesSeries(transaction, payment)
        ? Math.max(billingDay, new Date(transaction.occurredAt).getDate())
        : billingDay,
    day
  )
}

function hasNearby(
  transactions: readonly Transaction[],
  payment: RecurringPayment,
  due: number
): boolean {
  return transactions.some(
    (transaction) =>
      matchesSeries(transaction, payment) &&
      Math.abs(transaction.occurredAt - due) <= NEAR_DAYS * DAY_MS
  )
}

// Learn from confirmed history, then reconstruct missing occurrences per series.
// Both confirmed and pending expenses prevent the same occurrence being offered.
export function suggestRecurringTransactions(
  transactions: readonly Transaction[],
  now: number = Date.now()
): RecurringSuggestion[] {
  const confirmed = transactions.filter(
    (transaction) => transaction.state === "confirmed"
  )
  const suggestions: RecurringSuggestion[] = []

  for (const payment of detectRecurring(confirmed)) {
    const day = monthlyDay(payment, confirmed)
    let offset = 1
    let due = occurrenceAt(payment, offset, day)

    while (due < now) {
      if (!hasNearby(transactions, payment, due)) {
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

      offset += 1
      due = occurrenceAt(payment, offset, day)
    }
  }

  return suggestions.sort((a, b) => a.occurredAt - b.occurredAt)
}
