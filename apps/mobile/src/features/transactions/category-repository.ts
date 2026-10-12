import {
  DEFAULT_CATEGORIES,
  normalizeCategoryKeywords,
  UNCATEGORIZED_ID,
} from "./categories"
import { getDatabase } from "./db"
import { createId } from "./id"
import type { Category } from "./types"

interface CategoryRow {
  created_at: number
  id: string
  keywords: string
  name: string
  updated_at: number
}

const COLUMNS = "id, name, keywords, created_at, updated_at"

function parseStoredKeywords(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : []
  } catch {
    return []
  }
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    keywords: parseStoredKeywords(row.keywords),
    name: row.name,
  }
}

export async function listCustomCategories(): Promise<Category[]> {
  const database = await getDatabase()
  const rows = await database.getAllAsync<CategoryRow>(
    `SELECT ${COLUMNS} FROM categories ORDER BY created_at, name`
  )

  return rows.map(rowToCategory)
}

// The effective list: the user's own categories first (so they win keyword
// ties against the built-ins), then the built-in ones.
export async function listCategories(): Promise<Category[]> {
  return [...(await listCustomCategories()), ...DEFAULT_CATEGORIES]
}

export interface CategoryInput {
  keywords: readonly string[]
  name: string
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const database = await getDatabase()
  const now = Date.now()
  const category: Category = {
    id: createId(),
    keywords: normalizeCategoryKeywords(input.keywords),
    name: input.name.trim(),
  }

  await database.runAsync(
    `INSERT INTO categories (${COLUMNS}) VALUES (?, ?, ?, ?, ?)`,
    category.id,
    category.name,
    JSON.stringify(category.keywords),
    now,
    now
  )

  return category
}

export async function updateCategory(
  id: string,
  update: Partial<CategoryInput>
): Promise<void> {
  const assignments: string[] = []
  const values: (number | string)[] = []

  if (update.name !== undefined) {
    assignments.push("name = ?")
    values.push(update.name.trim())
  }

  if (update.keywords !== undefined) {
    assignments.push("keywords = ?")
    values.push(JSON.stringify(normalizeCategoryKeywords(update.keywords)))
  }

  if (assignments.length === 0) {
    return
  }

  assignments.push("updated_at = ?")
  values.push(Date.now(), id)

  const database = await getDatabase()
  await database.runAsync(
    `UPDATE categories SET ${assignments.join(", ")} WHERE id = ?`,
    ...values
  )
}

// Moves any transaction off the category before deleting it, so nothing is
// left pointing at a missing id (which would silently render as uncategorized).
export async function deleteCategory(id: string): Promise<void> {
  const database = await getDatabase()

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "UPDATE transactions SET category_id = ?, updated_at = ?, synced_at = NULL WHERE category_id = ?",
      UNCATEGORIZED_ID,
      Date.now(),
      id
    )
    await database.runAsync("DELETE FROM categories WHERE id = ?", id)
  })
}
