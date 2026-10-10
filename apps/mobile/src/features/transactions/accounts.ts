export type AccountKind = "cash" | "card" | "transfer"

export interface Account {
  createdAt: number
  id: string
  kind: AccountKind
  name: string
}

export interface DefaultAccount {
  id: string
  kind: AccountKind
  name: string
}

export const DEFAULT_ACCOUNTS: readonly DefaultAccount[] = [
  { id: "cash", kind: "cash", name: "Efectivo" },
  { id: "card", kind: "card", name: "Tarjeta" },
  { id: "transfer", kind: "transfer", name: "Transferencia" },
]

export function getAccountName(
  accounts: readonly Account[],
  accountId: string | null
): string | null {
  if (!accountId) {
    return null
  }

  return accounts.find((account) => account.id === accountId)?.name ?? null
}

export const ACCOUNT_KINDS: readonly AccountKind[] = [
  "cash",
  "card",
  "transfer",
]

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  card: "Tarjeta",
  cash: "Efectivo",
  transfer: "Transferencia",
}

export function validateAccountName(
  name: string,
  accounts: readonly Account[],
  currentId?: string
): string | null {
  const trimmed = name.trim()

  if (trimmed.length === 0) {
    return "Enter a name"
  }

  const normalized = trimmed.toLowerCase()
  const duplicate = accounts.some(
    (account) =>
      account.id !== currentId &&
      account.name.trim().toLowerCase() === normalized
  )

  return duplicate ? "An account with that name already exists" : null
}

export const ALL_ACCOUNTS = "all"
export const NO_ACCOUNT = "none"

export function filterTransactionsByAccount<
  T extends { accountId: string | null },
>(transactions: readonly T[], filter: string): T[] {
  if (filter === ALL_ACCOUNTS) {
    return [...transactions]
  }

  if (filter === NO_ACCOUNT) {
    return transactions.filter((transaction) => transaction.accountId === null)
  }

  return transactions.filter((transaction) => transaction.accountId === filter)
}
