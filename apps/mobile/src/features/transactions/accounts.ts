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
