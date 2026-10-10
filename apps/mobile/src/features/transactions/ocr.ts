import { hasTransactionSignal } from "./notification"
import { parseTransactionText } from "./parser"

// OCR returns every line on the screenshot. Pick the most likely transaction
// line: one with an amount, preferring a line that also reads like a payment.
export function selectTransactionText(ocrText: string): string | null {
  const lines = ocrText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const withAmount = lines.filter(
    (line) => parseTransactionText(line).amount !== null
  )

  return (
    withAmount.find((line) => hasTransactionSignal(line)) ??
    withAmount[0] ??
    lines[0] ??
    null
  )
}
