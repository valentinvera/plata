import type { Budget } from "./budget"
import { getDatabase } from "./db"

interface BudgetRow {
  amount: number
  category_id: string
  updated_at: number
}

const COLUMNS = "category_id, amount, updated_at"

function rowToBudget(row: BudgetRow): Budget {
  return {
    amount: row.amount,
    categoryId: row.category_id,
    updatedAt: row.updated_at,
  }
}

export async function listBudgets(): Promise<Budget[]> {
  const database = await getDatabase()
  const rows = await database.getAllAsync<BudgetRow>(
    `SELECT ${COLUMNS} FROM budgets ORDER BY category_id`
  )

  return rows.map(rowToBudget)
}

export async function setBudget(
  categoryId: string,
  amount: number
): Promise<void> {
  const database = await getDatabase()

  if (amount <= 0) {
    await database.runAsync(
      "DELETE FROM budgets WHERE category_id = ?",
      categoryId
    )
    return
  }

  await database.runAsync(
    "INSERT OR REPLACE INTO budgets (category_id, amount, updated_at) VALUES (?, ?, ?)",
    categoryId,
    amount,
    Date.now()
  )
}

export async function deleteBudget(categoryId: string): Promise<void> {
  const database = await getDatabase()
  await database.runAsync(
    "DELETE FROM budgets WHERE category_id = ?",
    categoryId
  )
}
