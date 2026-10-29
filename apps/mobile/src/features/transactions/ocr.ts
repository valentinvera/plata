import { hasTransactionSignal, isIncompleteTransaction } from "./notification"
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

// Context breaks ties, but can never outweigh a payment signal or amount.
const CONTEXT_WEIGHT = 0.25
const BARE_DATE_LINE = /^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/

function score(text: string): number {
  let value = 0
  const parsed = parseTransactionText(text)

  if (parsed.amount !== null) {
    value += 1
    if (parsed.merchant !== null) {
      value += CONTEXT_WEIGHT
    }
    if (parsed.occurredAt !== null) {
      value += CONTEXT_WEIGHT
    }
  }

  if (hasTransactionSignal(text)) {
    value += 2
  }

  return value
}

function isIncomplete(text: string): boolean {
  return isIncompleteTransaction(text, parseTransactionText(text).merchant)
}

// Preserve a rejected/pending label's relationship to its amount before
// scoring candidates. Otherwise the isolated amount could still win after
// its status line has been removed. A new payment signal starts another entry.
function incompleteLineIndexes(lines: readonly string[]): Set<number> {
  const rejected = new Set<number>()
  for (const [index, line] of lines.entries()) {
    const next = lines[index + 1]
    let end = index
    if (!isIncomplete(line)) {
      if (
        !next ||
        (hasTransactionSignal(line) && hasTransactionSignal(next)) ||
        !isIncomplete(`${line} ${next}`)
      ) {
        continue
      }
      end += 1
      rejected.add(end)
    }
    rejected.add(index)
    const amountLine = lines[end + 1]
    if (
      amountLine &&
      !hasTransactionSignal(amountLine) &&
      parseTransactionText(amountLine).amount !== null
    ) {
      rejected.add(end + 1)
    }
  }
  return rejected
}

function transactionCandidates(lines: readonly string[]): string[] {
  const candidates: string[] = []
  const rejected = incompleteLineIndexes(lines)

  for (const [index, line] of lines.entries()) {
    if (rejected.has(index) || isNonTransactionLine(line)) {
      continue
    }

    candidates.push(line)

    const next = lines[index + 1]
    if (!next || rejected.has(index + 1) || isNonTransactionLine(next)) {
      continue
    }

    // Adjacent complete payments belong to different candidates. Combining
    // them could attach the second payment's merchant/date to the first amount.
    const bothHaveAmounts =
      parseTransactionText(line).amount !== null &&
      parseTransactionText(next).amount !== null
    const bothHaveSignals =
      hasTransactionSignal(line) && hasTransactionSignal(next)
    if (bothHaveAmounts || bothHaveSignals) {
      continue
    }

    // A date printed below the merchant is context, not part of its name.
    const continuation = BARE_DATE_LINE.test(next) ? `el ${next}` : next
    candidates.push(`${line} ${continuation}`)
  }

  return candidates
}

// OCR returns every line on the screenshot. Score single lines and adjacent
// pairs (a payment label and its amount often sit on separate lines), skipping
// balance lines, and prefer candidates that retain their merchant and date.
export function selectTransactionText(ocrText: string): string | null {
  const lines = ocrText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return null
  }

  let best: { score: number; text: string } | null = null

  for (const text of transactionCandidates(lines)) {
    const candidate = { score: score(text), text }
    if (best === null || candidate.score > best.score) {
      best = candidate
    }
  }

  if (best && best.score > 0) {
    return best.text
  }

  // Nothing that reads like a payment or carries an amount means the screenshot
  // is not a transaction (a random screen, a gallery photo, ...). Returning its
  // first line would prefill the form with noise such as the status-bar clock.
  return null
}
