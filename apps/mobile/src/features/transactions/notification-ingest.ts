import {
  buildNotificationTransaction,
  parseNotificationPayload,
} from "./notification"
import { createTransaction } from "./repository"

export async function ingestNotification(raw: string): Promise<boolean> {
  const payload = parseNotificationPayload(raw)

  if (!payload) {
    return false
  }

  const transaction = buildNotificationTransaction(payload)

  if (!transaction) {
    return false
  }

  await createTransaction(transaction)
  return true
}
