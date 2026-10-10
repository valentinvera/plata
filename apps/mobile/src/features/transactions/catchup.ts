import { categorize } from "./categorizer"
import { createId } from "./id"
import { parseTransactionText } from "./parser"
import type { Currency, TransactionKind } from "./types"

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
  now: number = Date.now()
): CatchUpSuggestion[] {
  const suggestions: CatchUpSuggestion[] = []

  for (const raw of texts) {
    const text = raw.trim()
    if (!text) {
      continue
    }

    const parsed = parseTransactionText(text, now)
    const categorization = categorize(`${text} ${parsed.merchant ?? ""}`)

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
