import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { DateRange } from "./periods"
import {
  createTransaction,
  createTransactions,
  listTransactions,
  listTransactionsInRange,
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
