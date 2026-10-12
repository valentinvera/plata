import { ALL_ACCOUNTS, NO_ACCOUNT } from "./accounts"
import type {
  Currency,
  Transaction,
  TransactionKind,
  TransactionState,
} from "./types"

export interface TransactionFilter {
  accountId?: string
  categoryId?: string
  currency?: Currency
  from?: number
  kind?: TransactionKind
  maxAmount?: number
  minAmount?: number
  query?: string
  state?: TransactionState
  to?: number
}

export interface FilterClause {
  clause: string
  params: (number | string)[]
}

function searchTerm(filter: TransactionFilter): string | null {
  const query = filter.query?.trim()

  return query && query.length > 0 ? query.toLowerCase() : null
}

export function hasActiveFilters(filter: TransactionFilter): boolean {
  return (
    (filter.accountId !== undefined && filter.accountId !== ALL_ACCOUNTS) ||
    filter.categoryId !== undefined ||
    filter.currency !== undefined ||
    filter.from !== undefined ||
    filter.kind !== undefined ||
    filter.maxAmount !== undefined ||
    filter.minAmount !== undefined ||
    filter.state !== undefined ||
    filter.to !== undefined ||
    searchTerm(filter) !== null
  )
}

// Builds the SQL fragment (starting with " AND ") and its bound parameters for
// a filtered transaction query. The caller adds `deleted_at IS NULL`.
export function buildTransactionFilter(
  filter: TransactionFilter
): FilterClause {
  const conditions: string[] = []
  const params: (number | string)[] = []

  if (filter.accountId !== undefined && filter.accountId !== ALL_ACCOUNTS) {
    if (filter.accountId === NO_ACCOUNT) {
      conditions.push("account_id IS NULL")
    } else {
      conditions.push("account_id = ?")
      params.push(filter.accountId)
    }
  }

  if (filter.state !== undefined) {
    conditions.push("state = ?")
    params.push(filter.state)
  }

  if (filter.kind !== undefined) {
    conditions.push("kind = ?")
    params.push(filter.kind)
  }

  if (filter.currency !== undefined) {
    conditions.push("currency = ?")
    params.push(filter.currency)
  }

  if (filter.categoryId !== undefined) {
    conditions.push("category_id = ?")
    params.push(filter.categoryId)
  }

  if (filter.from !== undefined) {
    conditions.push("occurred_at >= ?")
    params.push(filter.from)
  }

  if (filter.to !== undefined) {
    conditions.push("occurred_at < ?")
    params.push(filter.to)
  }

  if (filter.minAmount !== undefined) {
    conditions.push("amount >= ?")
    params.push(filter.minAmount)
  }

  if (filter.maxAmount !== undefined) {
    conditions.push("amount <= ?")
    params.push(filter.maxAmount)
  }

  const term = searchTerm(filter)
  if (term) {
    conditions.push("(merchant LIKE ? OR note LIKE ?)")
    params.push(`%${term}%`, `%${term}%`)
  }

  return {
    clause: conditions.length > 0 ? ` AND ${conditions.join(" AND ")}` : "",
    params,
  }
}

// In-memory counterpart of `buildTransactionFilter`, for lists already loaded.
function matchesAccount(
  transaction: Transaction,
  filter: TransactionFilter
): boolean {
  if (filter.accountId === undefined || filter.accountId === ALL_ACCOUNTS) {
    return true
  }

  if (filter.accountId === NO_ACCOUNT) {
    return transaction.accountId === null
  }

  return transaction.accountId === filter.accountId
}

function matchesScalars(
  transaction: Transaction,
  filter: TransactionFilter
): boolean {
  if (filter.state !== undefined && transaction.state !== filter.state) {
    return false
  }

  if (filter.kind !== undefined && transaction.kind !== filter.kind) {
    return false
  }

  if (
    filter.currency !== undefined &&
    transaction.currency !== filter.currency
  ) {
    return false
  }

  return (
    filter.categoryId === undefined ||
    transaction.categoryId === filter.categoryId
  )
}

function matchesRange(
  transaction: Transaction,
  filter: TransactionFilter
): boolean {
  if (filter.from !== undefined && transaction.occurredAt < filter.from) {
    return false
  }

  if (filter.to !== undefined && transaction.occurredAt >= filter.to) {
    return false
  }

  if (filter.minAmount !== undefined && transaction.amount < filter.minAmount) {
    return false
  }

  return (
    filter.maxAmount === undefined || transaction.amount <= filter.maxAmount
  )
}

function matchesSearch(
  transaction: Transaction,
  filter: TransactionFilter
): boolean {
  const term = searchTerm(filter)

  if (!term) {
    return true
  }

  const haystack = `${transaction.merchant ?? ""} ${transaction.note ?? ""}`

  return haystack.toLowerCase().includes(term)
}

export function matchesFilter(
  transaction: Transaction,
  filter: TransactionFilter
): boolean {
  return (
    matchesAccount(transaction, filter) &&
    matchesScalars(transaction, filter) &&
    matchesRange(transaction, filter) &&
    matchesSearch(transaction, filter)
  )
}
