import { listCategories } from "./category-repository"
import {
  buildNotificationTransaction,
  type NotificationPayload,
  notificationTransactionId,
} from "./notification"
import { createTransaction, getTransaction } from "./repository"

export async function ingestNotificationPayload(
  payload: NotificationPayload
): Promise<boolean> {
  const transaction = buildNotificationTransaction(
    payload,
    Date.now(),
    await listCategories()
  )

  if (!transaction) {
    return false
  }

  // Android can repost the same notification, so the id is derived from its
  // source: a repeated delivery resolves to the same row and is a no-op.
  const id = notificationTransactionId(payload)

  if (await getTransaction(id)) {
    return false
  }

  try {
    await createTransaction({ ...transaction, id })
    return true
  } catch {
    return false
  }
}
