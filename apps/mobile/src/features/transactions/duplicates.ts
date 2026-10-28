import { startOfDay } from "./periods"
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

// Date-only inputs (e.g. "05/09") are parsed to noon on that day because the
// real time is unknown. Noon is a placeholder, not an observation, so the
// short window cannot tell two of these apart.
const DAY_COARSE_HOUR = 12

function isDayCoarse(occurredAt: number): boolean {
  const date = new Date(occurredAt)

  return (
    date.getHours() === DAY_COARSE_HOUR &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  )
}

// A merchant is required to build a duplicate key: without it, unrelated
// transactions that only share amount, currency and kind would collide.
function groupKey(transaction: Transaction): string | null {
  const merchant = transaction.merchant
    ? normalizeText(transaction.merchant)
    : ""

  if (!merchant) {
    return null
  }

  return `${transaction.currency}|${transaction.kind}|${transaction.amount}|${merchant}`
}

// Precise timestamps must stay within the short event window, even if a bank
// reuses the same notification text. When either timestamp is date-only, require
// matching nonblank input on the same local calendar day instead.
function isSameEvent(
  previous: Transaction,
  current: Transaction,
  windowMs: number
): boolean {
  if (isDayCoarse(previous.occurredAt) || isDayCoarse(current.occurredAt)) {
    return (
      Boolean(previous.rawRef?.trim()) &&
      previous.rawRef === current.rawRef &&
      startOfDay(previous.occurredAt) === startOfDay(current.occurredAt)
    )
  }

  return current.occurredAt - previous.occurredAt <= windowMs
}

function getPreciseTransaction(
  transaction: Transaction
): Transaction | undefined {
  return isDayCoarse(transaction.occurredAt) ? undefined : transaction
}

function findEventClusters(
  transactions: readonly Transaction[],
  windowMs: number
): Transaction[][] {
  const ordered = [...transactions].sort((a, b) => a.occurredAt - b.occurredAt)
  const clusters: Transaction[][] = []
  let cluster: Transaction[] = [ordered[0]]
  let firstPrecise = getPreciseTransaction(ordered[0])

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]
    const current = ordered[index]
    // A chain of short gaps, or a date-only copy between precise timestamps,
    // must not stretch one event over a much longer period.
    const matchesFirstPrecise =
      !firstPrecise || isSameEvent(firstPrecise, current, windowMs)
    if (matchesFirstPrecise && isSameEvent(previous, current, windowMs)) {
      cluster.push(current)
      firstPrecise ??= getPreciseTransaction(current)
      continue
    }

    if (cluster.length >= 2) {
      clusters.push(cluster)
    }
    cluster = [current]
    firstPrecise = getPreciseTransaction(current)
  }

  if (cluster.length >= 2) {
    clusters.push(cluster)
  }
  return clusters
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

    if (key === null) {
      continue
    }

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

    for (const cluster of findEventClusters(bucket, windowMs)) {
      groups.push({ key, transactions: cluster })
    }
  }

  return groups.sort(
    (a, b) => a.transactions[0].occurredAt - b.transactions[0].occurredAt
  )
}
