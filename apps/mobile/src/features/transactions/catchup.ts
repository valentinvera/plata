import { DEFAULT_CATEGORIES } from "./categories"
import { categorize } from "./categorizer"
import { createId } from "./id"
import { selectTransactionText } from "./ocr"
import { parseTransactionText } from "./parser"
import type { Category, Currency, TransactionKind } from "./types"

export interface CatchUpSuggestion {
  amount: number | null
  categoryId: string
  confidence: number
  currency: Currency
  id: string
  kind: TransactionKind
  merchant: string | null
  occurredAt: number | null
  raw: string
}

export type ValidCatchUpSuggestion = CatchUpSuggestion & { amount: number }

export function splitCatchUpTexts(blob: string): string[] {
  return blob
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function isSuggestionValid(
  suggestion: CatchUpSuggestion
): suggestion is ValidCatchUpSuggestion {
  return suggestion.amount !== null && suggestion.amount > 0
}

export function buildCatchUpSuggestions(
  texts: readonly string[],
  now: number = Date.now(),
  categories: readonly Category[] = DEFAULT_CATEGORIES
): CatchUpSuggestion[] {
  const suggestions: CatchUpSuggestion[] = []

  for (const raw of texts) {
    const text = raw.trim()
    if (!text) {
      continue
    }

    // Keep rejected lines in the preview count, but never let a balance or
    // credit limit become a transaction when the batch is confirmed.
    const candidate = selectTransactionText(text)
    const parsed = parseTransactionText(candidate ?? "", now)
    const categorization = categorize(
      `${text} ${parsed.merchant ?? ""}`,
      categories
    )

    suggestions.push({
      amount: parsed.amount,
      categoryId: categorization.categoryId,
      confidence: categorization.confidence,
      currency: parsed.currency,
      id: createId(),
      kind: parsed.kind,
      merchant: parsed.merchant,
      occurredAt: parsed.occurredAt,
      raw: text,
    })
  }

  return suggestions
}
