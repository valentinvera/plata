const DIACRITICS = /[\u0300-\u036f]/g
const WHITESPACE = /\s+/g
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
  return text
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(WHITESPACE, " ")
    .toLowerCase()
    .trim()
}

export function containsKeyword(normalized: string, keyword: string): boolean {
  return keywordRegex(keyword).test(normalized)
}
