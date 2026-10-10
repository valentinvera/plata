import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createTransaction,
  listTransactions,
  updateTransactionState,
} from "./repository"
import type { NewTransaction, TransactionState } from "./types"

export const transactionsQueryKey = ["transactions"] as const

export function useTransactions() {
  return useQuery({
    queryFn: listTransactions,
    queryKey: transactionsQueryKey,
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

export function useUpdateTransactionState() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { id: string; state: TransactionState }) =>
      updateTransactionState(input.id, input.state),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}
