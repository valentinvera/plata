import { DEFAULT_CATEGORIES } from "./categories"
import { buildExport, type ExportBundle, type ExportFormat } from "./export"
import { listAllTransactions } from "./repository"

// Reads every non-deleted transaction and serializes it. Writing/sharing the
// file is left to the caller (UI follow-up).
export async function exportTransactions(
  format: ExportFormat
): Promise<ExportBundle> {
  const transactions = await listAllTransactions()

  return buildExport(format, transactions, DEFAULT_CATEGORIES)
}
