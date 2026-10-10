import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  type AccountInput,
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
} from "./account-repository"
import { listBudgets, setBudget } from "./budget-repository"
import type { DateRange } from "./periods"
import type { TransactionUpdate } from "./repository"
import {
  createTransaction,
  createTransactions,
  deleteTransaction,
  getTransaction,
  listTransactions,
  listTransactionsByState,
  listTransactionsInRange,
  updateTransaction,
  updateTransactionState,
} from "./repository"
import type { NewTransaction, TransactionState } from "./types"

export const transactionsQueryKey = ["transactions"] as const

export function useTransactions() {
  return useQuery({
    queryFn: () => listTransactions(),
    queryKey: transactionsQueryKey,
  })
}

export function useSuggestedTransactions() {
  return useQuery({
    queryFn: () => listTransactionsByState("suggested"),
    queryKey: [...transactionsQueryKey, "state", "suggested"],
  })
}

export function useConfirmedTransactions() {
  return useQuery({
    queryFn: () => listTransactionsByState("confirmed"),
    queryKey: [...transactionsQueryKey, "state", "confirmed"],
  })
}

export function useTransactionsInRange(range: DateRange) {
  return useQuery({
    queryFn: () => listTransactionsInRange(range.start, range.end),
    queryKey: [...transactionsQueryKey, "range", range.start, range.end],
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: NewTransaction) => createTransaction(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export function useCreateTransactions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (inputs: NewTransaction[]) => createTransactions(inputs),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export function useUpdateTransactionState() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { id: string; state: TransactionState }) =>
      updateTransactionState(input.id, input.state),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryFn: () => getTransaction(id),
    queryKey: [...transactionsQueryKey, "id", id],
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { id: string; update: TransactionUpdate }) =>
      updateTransaction(input.id, input.update),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export const budgetsQueryKey = ["budgets"] as const

export function useBudgets() {
  return useQuery({ queryFn: listBudgets, queryKey: budgetsQueryKey })
}

export function useSetBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { amount: number; categoryId: string }) =>
      setBudget(input.categoryId, input.amount),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: budgetsQueryKey }),
  })
}

export const accountsQueryKey = ["accounts"] as const

export function useAccounts() {
  return useQuery({ queryFn: listAccounts, queryKey: accountsQueryKey })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AccountInput) => createAccount(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { id: string; update: Partial<AccountInput> }) =>
      updateAccount(input.id, input.update),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsQueryKey })
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey })
    },
  })
}
