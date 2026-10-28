import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  type AccountInput,
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
} from "./account-repository"
import { getAppMeta, setAppMeta } from "./app-meta-repository"
import { listBudgets, setBudget } from "./budget-repository"
import {
  type CategoryInput,
  createCategory,
  deleteCategory,
  listCategories,
  listCustomCategories,
  updateCategory,
} from "./category-repository"
import type { TransactionFilter } from "./filters"
import { LOCAL_DATA_NETWORK_MODE } from "./local-data-options"
import type { DateRange } from "./periods"
import type { Preferences } from "./preferences"
import { getPreferences, setPreferences } from "./preferences-repository"
import type { TransactionUpdate } from "./repository"
import {
  createTransaction,
  createTransactions,
  deleteTransaction,
  deleteTransactions,
  getLastLoggedTime,
  getTransaction,
  listAllTransactions,
  listTransactions,
  listTransactionsByState,
  listTransactionsFiltered,
  listTransactionsInRange,
  updateTransaction,
  updateTransactionState,
  updateTransactionsState,
} from "./repository"
import type { NewTransaction, Transaction, TransactionState } from "./types"

export const transactionsQueryKey = ["transactions"] as const

export function useTransactions() {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: () => listTransactions(),
    queryKey: transactionsQueryKey,
  })
}

export function useAllTransactions() {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: listAllTransactions,
    queryKey: [...transactionsQueryKey, "all"],
  })
}

export function useLastLoggedTime() {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: getLastLoggedTime,
    queryKey: [...transactionsQueryKey, "last"],
  })
}

export function useSuggestedTransactions(accountFilter: string) {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: () => listTransactionsByState("suggested", accountFilter),
    queryKey: [...transactionsQueryKey, "state", "suggested", accountFilter],
  })
}

export function useConfirmedTransactions(accountFilter: string) {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: () => listTransactionsByState("confirmed", accountFilter),
    queryKey: [...transactionsQueryKey, "state", "confirmed", accountFilter],
  })
}

export function useTransactionsInRange(range: DateRange) {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: () => listTransactionsInRange(range.start, range.end),
    queryKey: [...transactionsQueryKey, "range", range.start, range.end],
  })
}

export const SEARCH_PAGE_SIZE = 100

export function useFilteredTransactions(filter: TransactionFilter) {
  return useInfiniteQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    getNextPageParam: (lastPage: Transaction[], pages: Transaction[][]) =>
      lastPage.length < SEARCH_PAGE_SIZE
        ? undefined
        : pages.reduce((total, page) => total + page.length, 0),
    initialPageParam: 0,
    queryFn: ({ pageParam }): Promise<Transaction[]> =>
      listTransactionsFiltered(filter, {
        limit: SEARCH_PAGE_SIZE,
        offset: pageParam,
      }),
    queryKey: [...transactionsQueryKey, "filter", filter],
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (input: NewTransaction) => createTransaction(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export function useCreateTransactions() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (inputs: NewTransaction[]) => createTransactions(inputs),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export function useUpdateTransactionState() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (input: { id: string; state: TransactionState }) =>
      updateTransactionState(input.id, input.state),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export function useTransaction(id: string) {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: () => getTransaction(id),
    queryKey: [...transactionsQueryKey, "id", id],
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (input: { id: string; update: TransactionUpdate }) =>
      updateTransaction(input.id, input.update),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export function useDeleteTransactions() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (ids: string[]) => deleteTransactions(ids),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export function useUpdateTransactionsState() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (input: { ids: string[]; state: TransactionState }) =>
      updateTransactionsState(input.ids, input.state),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  })
}

export const budgetsQueryKey = ["budgets"] as const

export function useBudgets() {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: listBudgets,
    queryKey: budgetsQueryKey,
  })
}

export function useSetBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (input: { amount: number; categoryId: string }) =>
      setBudget(input.categoryId, input.amount),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: budgetsQueryKey }),
  })
}

export const accountsQueryKey = ["accounts"] as const

export function useAccounts() {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: listAccounts,
    queryKey: accountsQueryKey,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (input: AccountInput) => createAccount(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (input: { id: string; update: Partial<AccountInput> }) =>
      updateAccount(input.id, input.update),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsQueryKey })
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey })
    },
  })
}

export const categoriesQueryKey = ["categories"] as const

export function useCategories() {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: listCategories,
    queryKey: categoriesQueryKey,
  })
}

export function useCustomCategories() {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: listCustomCategories,
    queryKey: [...categoriesQueryKey, "custom"],
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (input: CategoryInput) => createCategory(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (input: { id: string; update: Partial<CategoryInput> }) =>
      updateCategory(input.id, input.update),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
      queryClient.invalidateQueries({ queryKey: budgetsQueryKey })
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey })
    },
  })
}

export const appMetaQueryKey = ["app-meta"] as const

export function useAppMeta(key: string) {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: () => getAppMeta(key),
    queryKey: [...appMetaQueryKey, key],
  })
}

export function useSetAppMeta() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (input: { key: string; value: string }) =>
      setAppMeta(input.key, input.value),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: appMetaQueryKey }),
  })
}

export const preferencesQueryKey = ["preferences"] as const

export function usePreferences() {
  return useQuery({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    queryFn: getPreferences,
    queryKey: preferencesQueryKey,
  })
}

export function useSetPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: LOCAL_DATA_NETWORK_MODE,
    mutationFn: (update: Partial<Preferences>) => setPreferences(update),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: preferencesQueryKey }),
  })
}
