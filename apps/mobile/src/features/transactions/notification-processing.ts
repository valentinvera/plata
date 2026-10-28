import {
  buildNotificationTransaction,
  type NotificationPayload,
  notificationTransactionId,
  parseNotificationPayload,
} from "./notification"
import type { Category, NewTransaction } from "./types"

interface NotificationStorage {
  createTransaction: (input: NewTransaction) => Promise<unknown>
  hasTransaction: (id: string) => Promise<boolean>
  listCategories: () => Promise<readonly Category[]>
}

export function createNotificationIngestor(storage: NotificationStorage) {
  return async (payload: NotificationPayload): Promise<boolean> => {
    const transaction = buildNotificationTransaction(
      payload,
      Date.now(),
      await storage.listCategories()
    )
    if (!transaction) {
      return false
    }

    const id = notificationTransactionId(payload)
    if (await storage.hasTransaction(id)) {
      return false
    }

    try {
      await storage.createTransaction({ ...transaction, id })
      return true
    } catch (error) {
      // Another writer may have persisted the same source in the meantime.
      // Only a known existing row is safe to acknowledge after a failed insert.
      if (await storage.hasTransaction(id)) {
        return false
      }
      throw error
    }
  }
}

interface NotificationQueue {
  ackAsync: () => Promise<void>
  readPendingsAsync: () => Promise<string>
}

interface NotificationDrainDependencies {
  ingest: (payload: NotificationPayload) => Promise<boolean>
  queue: NotificationQueue
}

async function drainBatch({
  ingest,
  queue,
}: NotificationDrainDependencies): Promise<number> {
  const raw = await queue.readPendingsAsync()
  let items: unknown
  try {
    items = JSON.parse(raw)
  } catch {
    return 0
  }
  if (!Array.isArray(items)) {
    return 0
  }

  let ingested = 0
  for (const item of items) {
    const payload = parseNotificationPayload(JSON.stringify(item))
    if (!payload) {
      continue
    }
    // biome-ignore lint/performance/noAwaitInLoops: SQLite writes and queue acknowledgement must stay ordered
    if (await ingest(payload)) {
      ingested += 1
    }
  }

  // A failed read or write must never acknowledge the native snapshot. Already
  // saved rows are recognized by source id when this batch is retried.
  await queue.ackAsync()
  return ingested
}

export function createNotificationDrainer(deps: NotificationDrainDependencies) {
  let running: Promise<number> | null = null
  return (): Promise<number> => {
    if (!running) {
      // Native acknowledgement belongs to the last read snapshot. Share one
      // drain so overlapping foreground events cannot replace that snapshot.
      running = drainBatch(deps).finally(() => {
        running = null
      })
    }
    return running
  }
}
