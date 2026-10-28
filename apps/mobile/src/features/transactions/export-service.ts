import { listAccounts } from "./account-repository"
import { listCategories } from "./category-repository"
import { buildExport, type ExportBundle, type ExportFormat } from "./export"
import { listAllTransactions } from "./repository"

// Read saved categories as well as accounts so labels and custom definitions
// survive the export. A failed read must not produce an incomplete file.
export async function exportTransactions(
  format: ExportFormat
): Promise<ExportBundle> {
  const [transactions, accounts, categories] = await Promise.all([
    listAllTransactions(),
    listAccounts(),
    listCategories(),
  ])

  return buildExport(format, transactions, categories, accounts)
}
