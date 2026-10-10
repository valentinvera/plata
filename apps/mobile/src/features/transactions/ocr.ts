import { hasTransactionSignal } from "./notification"
import { parseTransactionText } from "./parser"
import { containsKeyword, normalizeText } from "./text"

// Lines that mention a balance or a limit are not the transaction being imported.
const NON_TRANSACTION_SIGNALS = [
  "balance",
  "cierre",
  "disponible",
  "limite",
  "saldo",
]

function isNonTransactionLine(line: string): boolean {
  const normalized = normalizeText(line)
  return NON_TRANSACTION_SIGNALS.some((keyword) =>
    containsKeyword(normalized, keyword)
  )
}

function score(text: string): number {
  let value = 0

  if (parseTransactionText(text).amount !== null) {
    value += 1
  }

  if (hasTransactionSignal(text)) {
    value += 2
  }

  return value
}

// OCR returns every line on the screenshot. Score single lines and adjacent
// pairs (a payment label and its amount often sit on separate lines), skipping
// balance lines, and pick the best-scoring candidate.
export function selectTransactionText(ocrText: string): string | null {
  const lines = ocrText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return null
  }

  const candidates: string[] = []

  for (const [index, line] of lines.entries()) {
    if (isNonTransactionLine(line)) {
      continue
    }

    candidates.push(line)

    const next = lines[index + 1]
    if (next && !isNonTransactionLine(next)) {
      candidates.push(`${line} ${next}`)
    }
  }

  let best: { score: number; text: string } | null = null

  for (const text of candidates) {
    const candidate = { score: score(text), text }
    if (best === null || candidate.score > best.score) {
      best = candidate
    }
  }

  if (best && best.score > 0) {
    return best.text
  }

  return lines[0] ?? null
}
