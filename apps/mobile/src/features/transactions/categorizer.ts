import {
  DEFAULT_CATEGORIES,
  normalizeCategoryKeywords,
  UNCATEGORIZED_ID,
} from "./categories"
import { containsKeyword, normalizeText } from "./text"
import type { CategorizationResult, Category } from "./types"

interface CategoryMatch {
  category: Category
  matches: number
}

function findBestMatch(
  normalized: string,
  categories: readonly Category[]
): CategoryMatch | null {
  let best: CategoryMatch | null = null

  for (const category of categories) {
    let matches = 0
    // Existing saved rules can predate whitespace normalization. Canonicalize
    // and deduplicate here too, so aliases cannot inflate match confidence.
    for (const keyword of normalizeCategoryKeywords(category.keywords)) {
      if (containsKeyword(normalized, keyword)) {
        matches += 1
      }
    }

    if (matches > 0 && (best === null || matches > best.matches)) {
      best = { category, matches }
    }
  }

  return best
}

export function categorize(
  text: string,
  categories: readonly Category[] = DEFAULT_CATEGORIES
): CategorizationResult {
  const normalized = normalizeText(text)
  const match = findBestMatch(normalized, categories)

  if (match === null) {
    return { categoryId: UNCATEGORIZED_ID, confidence: 0 }
  }

  return {
    categoryId: match.category.id,
    confidence: Math.min(0.55 + match.matches * 0.15, 0.95),
  }
}
