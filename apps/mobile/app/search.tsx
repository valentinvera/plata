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
  useFilteredTransactions,
} from "@/src/features/transactions/hooks"
import type {
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

      {showResults && transactions.length === 0 ? (
        <Text className="mt-4 text-muted text-sm">
          No matching transactions.
        </Text>
      ) : null}

      {showResults
        ? transactions.map((transaction) => {
            const meta = [
              getAccountName(accounts, transaction.accountId),
              getCategoryById(transaction.categoryId, categories).name,
              transaction.state === "suggested" ? "To confirm" : null,
            ]
              .filter((part) => part !== null)
              .join(" · ")

            return (
              <Card className="mt-3 p-4" key={transaction.id}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleOpen(transaction.id)}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="font-medium text-foreground">
                      {transaction.merchant ?? "No merchant"}
                    </Text>
                    <Text className="text-foreground">
                      {formatAmount(transaction.amount, transaction.currency)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-muted text-xs">{meta}</Text>
                </Pressable>
              </Card>
            )
          })
        : null}

      {showResults && hasNextPage ? (
        <Button
          className="mt-4"
          isDisabled={isFetchingNextPage}
          onPress={() => fetchNextPage()}
          variant="outline"
        >
          <Button.Label>
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button.Label>
        </Button>
      ) : null}
    </Container>
  )
}
