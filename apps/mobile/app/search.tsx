import { router } from "expo-router"
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  Spinner,
  TextField,
} from "heroui-native"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Pressable, ScrollView, Text, View } from "react-native"

import { Container } from "@/components/container"
import {
  type Account,
  ALL_ACCOUNTS,
  getAccountName,
  NO_ACCOUNT,
} from "@/src/features/transactions/accounts"
import { getCategoryById } from "@/src/features/transactions/categories"
import type { TransactionFilter } from "@/src/features/transactions/filters"
import { formatAmount } from "@/src/features/transactions/format"
import {
  useAccounts,
  useCategories,
  useDeleteTransactions,
  useFilteredTransactions,
  useUpdateTransactionsState,
} from "@/src/features/transactions/hooks"
import type {
  Category,
  Transaction,
  TransactionKind,
  TransactionState,
} from "@/src/features/transactions/types"

const ALL_CATEGORIES = "all"
const SEARCH_DEBOUNCE_MS = 250

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)

    return () => clearTimeout(timer)
  }, [delayMs, value])

  return debounced
}

const KIND_OPTIONS: readonly {
  label: string
  value: TransactionKind | "all"
}[] = [
  { label: "All", value: "all" },
  { label: "Expenses", value: "expense" },
  { label: "Income", value: "income" },
]

const STATE_OPTIONS: readonly {
  label: string
  value: TransactionState | "all"
}[] = [
  { label: "All", value: "all" },
  { label: "Confirmed", value: "confirmed" },
  { label: "To confirm", value: "suggested" },
]

function OptionChip({
  label,
  onPress,
  selected,
}: {
  label: string
  onPress: () => void
  selected: boolean
}) {
  return (
    <Chip
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      variant={selected ? "primary" : "soft"}
    >
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  )
}

function FilterRow({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-muted text-sm">{label}</Text>
      <ScrollView
        accessibilityRole="radiogroup"
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  )
}

function useBatchActions() {
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const removeTransactions = useDeleteTransactions()
  const updateStates = useUpdateTransactionsState()

  const toggleSelected = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }, [])

  const exitSelection = useCallback(() => {
    setSelecting(false)
    setSelected(new Set())
    setConfirmingDelete(false)
    setError(null)
  }, [])

  const startSelecting = useCallback(() => setSelecting(true), [])

  const resetSelection = useCallback(() => {
    setSelected(new Set())
    setConfirmingDelete(false)
    setError(null)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (selected.size === 0) {
      return
    }

    setError(null)
    try {
      await updateStates.mutateAsync({
        ids: [...selected],
        state: "confirmed",
      })
      exitSelection()
    } catch {
      setError("Could not update the selected transactions.")
    }
  }, [exitSelection, selected, updateStates])

  const handleDelete = useCallback(async () => {
    if (selected.size === 0) {
      return
    }

    setError(null)
    try {
      await removeTransactions.mutateAsync([...selected])
      exitSelection()
    } catch {
      setError("Could not delete the selected transactions.")
    }
  }, [exitSelection, removeTransactions, selected])

  return {
    confirmingDelete,
    error,
    exitSelection,
    handleConfirm,
    handleDelete,
    isBusy: removeTransactions.isPending || updateStates.isPending,
    resetSelection,
    selected,
    selecting,
    setConfirmingDelete,
    startSelecting,
    toggleSelected,
  }
}

function SearchResultCard({
  accounts,
  categories,
  onOpen,
  onToggle,
  selected,
  selecting,
  transaction,
}: {
  accounts: readonly Account[]
  categories: readonly Category[]
  onOpen: (id: string) => void
  onToggle: (id: string) => void
  selected: ReadonlySet<string>
  selecting: boolean
  transaction: Transaction
}) {
  const isSelected = selecting && selected.has(transaction.id)
  const meta = [
    getAccountName(accounts, transaction.accountId),
    getCategoryById(transaction.categoryId, categories).name,
    transaction.state === "suggested" ? "To confirm" : null,
  ]
    .filter((part) => part !== null)
    .join(" · ")

  return (
    <Card className="mt-3 p-4">
      <Pressable
        accessibilityRole={selecting ? "checkbox" : "button"}
        accessibilityState={selecting ? { checked: isSelected } : undefined}
        onPress={() =>
          selecting ? onToggle(transaction.id) : onOpen(transaction.id)
        }
      >
        <View className="flex-row items-center justify-between">
          <Text
            className="flex-1 font-medium text-foreground"
            numberOfLines={1}
          >
            {isSelected ? "✓ " : ""}
            {transaction.merchant ?? "No merchant"}
          </Text>
          <Text className="ml-3 text-foreground">
            {formatAmount(transaction.amount, transaction.currency)}
          </Text>
        </View>
        <Text className="mt-1 text-muted text-xs">{meta}</Text>
      </Pressable>
    </Card>
  )
}

function SelectionBar({
  batch,
}: {
  batch: ReturnType<typeof useBatchActions>
}) {
  return (
    <View className="mt-3 gap-2">
      <Text className="text-muted text-sm">{batch.selected.size} selected</Text>
      <View className="flex-row flex-wrap gap-2">
        <Button
          isDisabled={batch.selected.size === 0 || batch.isBusy}
          onPress={batch.handleConfirm}
          variant="outline"
        >
          <Button.Label>Confirm</Button.Label>
        </Button>
        {batch.confirmingDelete ? (
          <Button
            isDisabled={batch.isBusy}
            onPress={batch.handleDelete}
            variant="outline"
          >
            <Button.Label>Yes, delete</Button.Label>
          </Button>
        ) : (
          <Button
            isDisabled={batch.selected.size === 0 || batch.isBusy}
            onPress={() => batch.setConfirmingDelete(true)}
            variant="outline"
          >
            <Button.Label>Delete</Button.Label>
          </Button>
        )}
        {batch.confirmingDelete ? (
          <Button
            isDisabled={batch.isBusy}
            onPress={() => batch.setConfirmingDelete(false)}
            variant="outline"
          >
            <Button.Label>Cancel</Button.Label>
          </Button>
        ) : null}
      </View>
    </View>
  )
}

function ResultsHeader({
  batch,
  count,
}: {
  batch: ReturnType<typeof useBatchActions>
  count: number
}) {
  return (
    <View className="mt-4 flex-row items-center justify-between">
      <Text className="text-muted text-sm">
        {`${count} result${count === 1 ? "" : "s"}`}
      </Text>
      {count > 0 || batch.selecting ? (
        <Button
          onPress={batch.selecting ? batch.exitSelection : batch.startSelecting}
          variant="outline"
        >
          <Button.Label>{batch.selecting ? "Done" : "Select"}</Button.Label>
        </Button>
      ) : null}
    </View>
  )
}

function SearchResults({
  accounts,
  batch,
  categories,
  hasNextPage,
  isFetchingNextPage,
  onFetchMore,
  onOpen,
  transactions,
}: {
  accounts: readonly Account[]
  batch: ReturnType<typeof useBatchActions>
  categories: readonly Category[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onFetchMore: () => void
  onOpen: (id: string) => void
  transactions: readonly Transaction[]
}) {
  return (
    <>
      {transactions.length === 0 ? (
        <Text className="mt-4 text-muted text-sm">
          No matching transactions.
        </Text>
      ) : null}

      {transactions.map((transaction) => (
        <SearchResultCard
          accounts={accounts}
          categories={categories}
          key={transaction.id}
          onOpen={onOpen}
          onToggle={batch.toggleSelected}
          selected={batch.selected}
          selecting={batch.selecting}
          transaction={transaction}
        />
      ))}

      {hasNextPage ? (
        <Button
          className="mt-4"
          isDisabled={isFetchingNextPage}
          onPress={onFetchMore}
          variant="outline"
        >
          <Button.Label>
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button.Label>
        </Button>
      ) : null}
    </>
  )
}

export default function SearchScreen() {
  const [query, setQuery] = useState("")
  const [accountId, setAccountId] = useState(ALL_ACCOUNTS)
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES)
  const [kind, setKind] = useState<TransactionKind | "all">("all")
  const [state, setState] = useState<TransactionState | "all">("all")

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  const { data: accountsData } = useAccounts()
  const { data: categoriesData } = useCategories()
  const accounts = accountsData ?? []
  const categories = categoriesData ?? []
  const batch = useBatchActions()

  const filter: TransactionFilter = useMemo(
    () => ({
      accountId,
      categoryId: categoryId === ALL_CATEGORIES ? undefined : categoryId,
      kind: kind === "all" ? undefined : kind,
      query: debouncedQuery,
      state: state === "all" ? undefined : state,
    }),
    [accountId, categoryId, debouncedQuery, kind, state]
  )

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useFilteredTransactions(filter)
  const transactions = useMemo(() => data?.pages.flat() ?? [], [data])
  const showResults = !(isLoading || isError)

  const handleOpen = useCallback((id: string) => {
    router.push({ pathname: "/transaction/[id]", params: { id } })
  }, [])

  // A filter change hides rows, so drop any selection made under the old scope.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rerun when the search scope changes
  useEffect(() => {
    batch.resetSelection()
  }, [accountId, batch.resetSelection, categoryId, debouncedQuery, kind, state])

  return (
    <Container className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">Search</Text>

      <TextField className="mt-3">
        <Label>Text</Label>
        <Input
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="Merchant or note"
          value={query}
        />
      </TextField>

      <FilterRow label="Type">
        {KIND_OPTIONS.map((option) => (
          <OptionChip
            key={option.value}
            label={option.label}
            onPress={() => setKind(option.value)}
            selected={kind === option.value}
          />
        ))}
      </FilterRow>

      <FilterRow label="Status">
        {STATE_OPTIONS.map((option) => (
          <OptionChip
            key={option.value}
            label={option.label}
            onPress={() => setState(option.value)}
            selected={state === option.value}
          />
        ))}
      </FilterRow>

      <FilterRow label="Account">
        <OptionChip
          label="All"
          onPress={() => setAccountId(ALL_ACCOUNTS)}
          selected={accountId === ALL_ACCOUNTS}
        />
        <OptionChip
          label="No account"
          onPress={() => setAccountId(NO_ACCOUNT)}
          selected={accountId === NO_ACCOUNT}
        />
        {accounts.map((account) => (
          <OptionChip
            key={account.id}
            label={account.name}
            onPress={() => setAccountId(account.id)}
            selected={accountId === account.id}
          />
        ))}
      </FilterRow>

      <FilterRow label="Category">
        <OptionChip
          label="All"
          onPress={() => setCategoryId(ALL_CATEGORIES)}
          selected={categoryId === ALL_CATEGORIES}
        />
        {categories.map((category) => (
          <OptionChip
            key={category.id}
            label={category.name}
            onPress={() => setCategoryId(category.id)}
            selected={categoryId === category.id}
          />
        ))}
      </FilterRow>

      {showResults ? (
        <ResultsHeader batch={batch} count={transactions.length} />
      ) : null}

      {batch.selecting ? <SelectionBar batch={batch} /> : null}

      {batch.error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-3 text-destructive text-sm"
        >
          {batch.error}
        </Text>
      ) : null}

      {isLoading ? (
        <View className="items-center py-6">
          <Spinner />
        </View>
      ) : null}

      {isError ? (
        <Card className="mt-4 items-center p-6">
          <Text className="text-center font-medium text-foreground">
            Could not search
          </Text>
          <Button className="mt-3" onPress={() => refetch()} size="sm">
            <Button.Label>Retry</Button.Label>
          </Button>
        </Card>
      ) : null}

      {showResults ? (
        <SearchResults
          accounts={accounts}
          batch={batch}
          categories={categories}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onFetchMore={() => fetchNextPage()}
          onOpen={handleOpen}
          transactions={transactions}
        />
      ) : null}
    </Container>
  )
}
