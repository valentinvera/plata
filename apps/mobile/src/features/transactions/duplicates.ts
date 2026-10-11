import { normalizeText } from "./text"
import type { Transaction } from "./types"

export interface DuplicateGroup {
  key: string
  transactions: Transaction[]
}

// Duplicates usually arrive seconds or minutes apart from different sources
// (notification, screenshot, manual), so the default window stays short to
// avoid flagging two genuine purchases.
const DEFAULT_WINDOW_MS = 5 * 60 * 1000

function groupKey(transaction: Transaction): string {
  const merchant = transaction.merchant
    ? normalizeText(transaction.merchant)
    : ""

  return `${transaction.currency}|${transaction.kind}|${transaction.amount}|${merchant}`
}

// Groups transactions that look like the same event: same amount, currency,
// kind and merchant, within a short time window.
export function findDuplicateGroups(
  transactions: readonly Transaction[],
  windowMs = DEFAULT_WINDOW_MS
): DuplicateGroup[] {
  const byKey = new Map<string, Transaction[]>()

  for (const transaction of transactions) {
    const key = groupKey(transaction)
    const bucket = byKey.get(key)

    if (bucket) {
      bucket.push(transaction)
    } else {
      byKey.set(key, [transaction])
    }
  }

  const groups: DuplicateGroup[] = []

  for (const [key, bucket] of byKey) {
    if (bucket.length < 2) {
      continue
    }

    const ordered = [...bucket].sort((a, b) => a.occurredAt - b.occurredAt)
    let cluster: Transaction[] = [ordered[0]]

    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1]
      const current = ordered[index]

      if (current.occurredAt - previous.occurredAt <= windowMs) {
        cluster.push(current)
      } else {
        if (cluster.length >= 2) {
          groups.push({ key, transactions: cluster })
        }

        cluster = [current]
      }
    }

    if (cluster.length >= 2) {
      groups.push({ key, transactions: cluster })
    }
  }

  return groups.sort(
    (a, b) => a.transactions[0].occurredAt - b.transactions[0].occurredAt
  )
}
