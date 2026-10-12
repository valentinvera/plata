import { File, Paths } from "expo-file-system"
import { isAvailableAsync, shareAsync } from "expo-sharing"

import type { ExportFormat } from "./export"
import { exportTransactions } from "./export-service"

// Writes the export to a cache file and opens the system share sheet.
// Returns false when sharing is not available on this platform.
export async function shareTransactions(
  format: ExportFormat
): Promise<boolean> {
  if (!(await isAvailableAsync())) {
    return false
  }

  const bundle = await exportTransactions(format)
  const file = new File(Paths.cache, bundle.filename)

  file.create({ overwrite: true })
  file.write(bundle.content)

  await shareAsync(file.uri, {
    dialogTitle: "Export transactions",
    mimeType: bundle.mimeType,
  })

  return true
}
