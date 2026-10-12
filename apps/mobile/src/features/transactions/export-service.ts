import { listAccounts } from "./account-repository"
import { DEFAULT_CATEGORIES } from "./categories"
import { buildExport, type ExportBundle, type ExportFormat } from "./export"
import { listAllTransactions } from "./repository"

// Reads every non-deleted transaction (plus accounts for their labels) and
// serializes it. Writing/sharing the file is left to the caller (UI follow-up).
export async function exportTransactions(
  format: ExportFormat
): Promise<ExportBundle> {
  const [transactions, accounts] = await Promise.all([
    listAllTransactions(),
    listAccounts(),
  ])

  return buildExport(format, transactions, DEFAULT_CATEGORIES, accounts)
}
