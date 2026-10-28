import { listCategories } from "./category-repository"
import { createNotificationIngestor } from "./notification-processing"
import { createTransaction, hasTransaction } from "./repository"

export const ingestNotificationPayload = createNotificationIngestor({
  createTransaction,
  hasTransaction,
  listCategories,
})
