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

function hasMatchingOccurrence(
  transactions: readonly Transaction[],
  payment: RecurringPayment,
  previousDue: number,
  due: number,
  nextDue: number
): boolean {
  return transactions.some((transaction) => {
    if (!matchesSeries(transaction, payment)) {
      return false
    }
    const distance = Math.abs(transaction.occurredAt - due)
    // Weekly tolerance windows overlap. Match only the nearest calendar
    // occurrence; an exact midpoint belongs to the earlier one, never both.
    return (
      distance <= NEAR_DAYS * DAY_MS &&
      distance < Math.abs(transaction.occurredAt - previousDue) &&
      distance <= Math.abs(transaction.occurredAt - nextDue)
    )
  })
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
    let previousDue = payment.lastOccurredAt
    let due = occurrenceAt(payment, offset, day)

    while (due < now) {
      const nextDue = occurrenceAt(payment, offset + 1, day)
      if (
        !hasMatchingOccurrence(transactions, payment, previousDue, due, nextDue)
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

      offset += 1
      previousDue = due
      due = nextDue
    }
  }

  return suggestions.sort((a, b) => a.occurredAt - b.occurredAt)
}
