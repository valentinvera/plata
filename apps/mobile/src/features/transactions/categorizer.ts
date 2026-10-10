import { DEFAULT_CATEGORIES, UNCATEGORIZED_ID } from "./categories"
import type { CategorizationResult, Category } from "./types"

const DIACRITICS = /[\u0300-\u036f]/g
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g

const keywordRegexCache = new Map<string, RegExp>()

function keywordRegex(keyword: string): RegExp {
  const cached = keywordRegexCache.get(keyword)
  if (cached) {
    return cached
  }

  const escaped = keyword.replace(REGEX_SPECIALS, "\\$&")
  const regex = new RegExp(`\\b${escaped}\\b`, "u")
  keywordRegexCache.set(keyword, regex)
  return regex
}

export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim()
}

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
    for (const keyword of category.keywords) {
      if (keywordRegex(keyword).test(normalized)) {
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
