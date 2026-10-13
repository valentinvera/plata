import { Redirect, router, useFocusEffect } from "expo-router"
import { Button, Card, Chip, Spinner } from "heroui-native"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AppState,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  View,
} from "react-native"

import { Container } from "@/components/container"
import {
  ALL_ACCOUNTS,
  getAccountName,
  NO_ACCOUNT,
} from "@/src/features/transactions/accounts"
import {
  DEFAULT_CATEGORIES,
  getCategoryById,
} from "@/src/features/transactions/categories"
import { formatAmount } from "@/src/features/transactions/format"
import { computeHighlights } from "@/src/features/transactions/highlights"
import {
  useAccounts,
  useAllTransactions,
  useAppMeta,
  useCategories,
  useConfirmedTransactions,
  useSuggestedTransactions,
  useTransactionsInRange,
  useUpdateTransactionState,
} from "@/src/features/transactions/hooks"
import {
  ONBOARDING_COMPLETED_KEY,
  shouldShowOnboarding,
} from "@/src/features/transactions/onboarding"
import { monthRange } from "@/src/features/transactions/periods"
import type { Transaction } from "@/src/features/transactions/types"

const DEFAULT_CURRENCY = "ARS"

function changeLabel(ratio: number | null): string {
  if (ratio === null) {
    return ""
  }

  const percent = Math.round(ratio * 100)

  if (percent === 0) {
    return " · same as last month"
  }

  return percent > 0
    ? ` · +${percent}% vs last month`
    : ` · ${percent}% vs last month`
}

interface NavAction {
  label: string
  onPress: () => void
}

function NavSection({
  actions,
  title,
}: {
  actions: readonly NavAction[]
  title: string
}) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-muted text-sm">{title}</Text>
      <View className="flex-row flex-wrap gap-2">
        {actions.map((action) => (
          <Button key={action.label} onPress={action.onPress} variant="outline">
            <Button.Label>{action.label}</Button.Label>
          </Button>
        ))}
      </View>
    </View>
  )
}

interface TransactionSection {
  data: Transaction[]
  title: string
  type: "suggested" | "confirmed"
}

export default function TransactionsScreen() {
  const [accountFilter, setAccountFilter] = useState(ALL_ACCOUNTS)

  const {
    data: suggestedData,
    isError: suggestedError,
    isLoading: suggestedLoading,
    refetch: refetchSuggested,
  } = useSuggestedTransactions(accountFilter)
  const {
    data: confirmedData,
    isError: confirmedError,
    isLoading: confirmedLoading,
    refetch: refetchConfirmed,
  } = useConfirmedTransactions(accountFilter)
  const updateState = useUpdateTransactionState()
  const { data: accountsData } = useAccounts()
  const { data: categoriesData } = useCategories()
  const [now, setNow] = useState(Date.now)

  // Refresh the range when the screen regains focus so a month boundary is not missed.
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now())
    }, [])
  )

  // ...and when the app is resumed without a navigation change.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        setNow(Date.now())
      }
    })

    return () => subscription.remove()
  }, [])

  const currentMonth = useMemo(() => monthRange(now), [now])
  const previousMonth = useMemo(
    () => monthRange(currentMonth.start - 1),
    [currentMonth.start]
  )
  const { data: allData } = useAllTransactions()
  const { data: monthData } = useTransactionsInRange(currentMonth)
  const { data: previousData } = useTransactionsInRange(previousMonth)

  const allCategories = useMemo(
    () => categoriesData ?? DEFAULT_CATEGORIES,
    [categoriesData]
  )
  const highlights = useMemo(() => {
    const confirmed = (items: Transaction[]) =>
      items.filter((item) => item.state === "confirmed")

    return computeHighlights({
      currency: DEFAULT_CURRENCY,
      current: confirmed(monthData ?? []),
      previous: confirmed(previousData ?? []),
      recent: confirmed(allData ?? []),
    })
  }, [allData, monthData, previousData])

  const accounts = useMemo(() => accountsData ?? [], [accountsData])
  const { data: onboardingValue, isLoading: onboardingLoading } = useAppMeta(
    ONBOARDING_COMPLETED_KEY
  )

  // If the filtered account is deleted elsewhere, fall back to showing everything.
  useEffect(() => {
    if (!accountsData) {
      return
    }
    if (accountFilter === ALL_ACCOUNTS || accountFilter === NO_ACCOUNT) {
      return
    }
    if (!accountsData.some((account) => account.id === accountFilter)) {
      setAccountFilter(ALL_ACCOUNTS)
    }
  }, [accountFilter, accountsData])

  const isLoading = suggestedLoading || confirmedLoading
  const isError = suggestedError || confirmedError

  const allSections: TransactionSection[] = [
    { data: suggestedData ?? [], title: "To confirm", type: "suggested" },
    { data: confirmedData ?? [], title: "Confirmed", type: "confirmed" },
  ]
  const sections = allSections.filter((section) => section.data.length > 0)

  const handleRetry = useCallback(async () => {
    await Promise.all([refetchSuggested(), refetchConfirmed()])
  }, [refetchConfirmed, refetchSuggested])

  const handleAdd = useCallback(() => {
    router.push("/add-transaction")
  }, [])

  const handleWeek = useCallback(() => {
    router.push("/week")
  }, [])

  const handleCatchUp = useCallback(() => {
    router.push("/catch-up")
  }, [])

  const handleBudgets = useCallback(() => {
    router.push("/budgets")
  }, [])

  const handleAccounts = useCallback(() => {
    router.push("/accounts")
  }, [])

  const handleAccount = useCallback(() => {
    router.push("/account")
  }, [])

  const handleSearch = useCallback(() => {
    router.push("/search")
  }, [])

  const handleCategories = useCallback(() => {
    router.push("/categories")
  }, [])

  const handlePreferences = useCallback(() => {
    router.push("/preferences")
  }, [])

  const handleExport = useCallback(() => {
    router.push("/export")
  }, [])

  const handleDuplicates = useCallback(() => {
    router.push("/duplicates")
  }, [])

  const handleRecurring = useCallback(() => {
    router.push("/recurring")
  }, [])

  const handleInsights = useCallback(() => {
    router.push("/insights")
  }, [])

  const handleNotifications = useCallback(() => {
    router.push("/notifications")
  }, [])

  const handleConfirm = useCallback(
    (id: string) => {
      updateState.mutate({ id, state: "confirmed" })
    },
    [updateState]
  )

  const handleOpen = useCallback((id: string) => {
    router.push({ pathname: "/transaction/[id]", params: { id } })
  }, [])

  const renderItem = useCallback(
    ({ item, section }: { item: Transaction; section: TransactionSection }) => {
      const category = getCategoryById(item.categoryId, allCategories).name
      const amount = formatAmount(item.amount, item.currency)
      const accountName = getAccountName(accounts, item.accountId)
      const meta = accountName
        ? `${accountName} · ${category} · ${amount}`
        : `${category} · ${amount}`

      return (
        <Card className="mt-3 p-4">
          <Pressable
            accessibilityRole="button"
            onPress={() => handleOpen(item.id)}
          >
            <Text className="font-medium text-foreground">
              {item.merchant ?? "No merchant"}
            </Text>
            <Text className="mt-1 text-muted text-xs">{meta}</Text>
          </Pressable>
          {section.type === "suggested" ? (
            <Button
              className="mt-3"
              onPress={() => handleConfirm(item.id)}
              size="sm"
            >
              <Button.Label>Confirm</Button.Label>
            </Button>
          ) : null}
        </Card>
      )
    },
    [accounts, allCategories, handleConfirm, handleOpen]
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: TransactionSection }) => (
      <Text className="mt-6 font-semibold text-foreground">
        {section.title}
      </Text>
    ),
    []
  )

  const keyExtractor = useCallback((item: Transaction) => item.id, [])

  const header = (
    <View>
      <Text className="pt-3 font-bold text-2xl text-foreground">Plata</Text>
      <Text className="mt-1 text-muted text-sm">Your transactions</Text>

      <Card className="mt-4 p-4">
        <Text className="font-semibold text-foreground">This month</Text>
        <Text className="mt-1 text-foreground">
          {formatAmount(highlights.monthExpense, DEFAULT_CURRENCY)}
          {changeLabel(highlights.monthExpenseChangeRatio)}
        </Text>
        {highlights.topCategory ? (
          <Text className="mt-1 text-muted text-xs">
            Top:{" "}
            {
              getCategoryById(highlights.topCategory.categoryId, allCategories)
                .name
            }{" "}
            · {formatAmount(highlights.topCategory.amount, DEFAULT_CURRENCY)}
          </Text>
        ) : null}
        <Text className="mt-1 text-muted text-xs">
          {highlights.recurring} recurring · {highlights.duplicates} possible
          duplicates
        </Text>
      </Card>

      <Button className="mt-4" onPress={handleAdd}>
        <Button.Label>Add transaction</Button.Label>
      </Button>

      <NavSection
        actions={[
          { label: "Catch up", onPress: handleCatchUp },
          { label: "Budgets", onPress: handleBudgets },
          { label: "Categories", onPress: handleCategories },
          { label: "Preferences", onPress: handlePreferences },
        ]}
        title="Plan"
      />

      <NavSection
        actions={[
          { label: "This week", onPress: handleWeek },
          { label: "Insights", onPress: handleInsights },
          { label: "Recurring", onPress: handleRecurring },
          { label: "Duplicates", onPress: handleDuplicates },
          { label: "Search", onPress: handleSearch },
        ]}
        title="Activity"
      />

      <NavSection
        actions={[
          { label: "Accounts", onPress: handleAccounts },
          { label: "Account", onPress: handleAccount },
          ...(Platform.OS === "web"
            ? []
            : [{ label: "Export", onPress: handleExport }]),
          ...(Platform.OS === "android"
            ? [{ label: "Automatic import", onPress: handleNotifications }]
            : []),
        ]}
        title="Data"
      />

      <Text className="mt-4 mb-2 text-muted text-sm">Filter by account</Text>
      <ScrollView
        accessibilityRole="radiogroup"
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <Chip
          accessibilityRole="radio"
          accessibilityState={{ selected: accountFilter === ALL_ACCOUNTS }}
          onPress={() => setAccountFilter(ALL_ACCOUNTS)}
          variant={accountFilter === ALL_ACCOUNTS ? "primary" : "soft"}
        >
          <Chip.Label>All</Chip.Label>
        </Chip>
        <Chip
          accessibilityRole="radio"
          accessibilityState={{ selected: accountFilter === NO_ACCOUNT }}
          onPress={() => setAccountFilter(NO_ACCOUNT)}
          variant={accountFilter === NO_ACCOUNT ? "primary" : "soft"}
        >
          <Chip.Label>No account</Chip.Label>
        </Chip>
        {accounts.map((account) => (
          <Chip
            accessibilityRole="radio"
            accessibilityState={{ selected: accountFilter === account.id }}
            key={account.id}
            onPress={() => setAccountFilter(account.id)}
            variant={accountFilter === account.id ? "primary" : "soft"}
          >
            <Chip.Label>{account.name}</Chip.Label>
          </Chip>
        ))}
      </ScrollView>
    </View>
  )

  if (onboardingLoading) {
    return (
      <Container className="px-5">
        <View className="items-center py-8">
          <Spinner />
        </View>
      </Container>
    )
  }

  if (shouldShowOnboarding(onboardingValue ?? null)) {
    return <Redirect href="/onboarding" />
  }

  return (
    <Container className="px-5" isScrollable={false}>
      {isLoading ? (
        <View className="items-center py-8">
          <Spinner />
        </View>
      ) : null}

      {isError ? (
        <Card className="mt-4 items-center p-6">
          <Text className="text-center font-medium text-foreground">
            Could not load your transactions
          </Text>
          <Button className="mt-3" onPress={handleRetry} size="sm">
            <Button.Label>Retry</Button.Label>
          </Button>
        </Card>
      ) : null}

      {isLoading || isError ? null : (
        <SectionList
          contentContainerClassName="pb-8"
          keyExtractor={keyExtractor}
          ListEmptyComponent={
            <Text className="mt-4 text-muted text-sm">
              {accountFilter === ALL_ACCOUNTS
                ? "No transactions yet."
                : "No transactions for this filter."}
            </Text>
          }
          ListHeaderComponent={header}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          sections={sections}
        />
      )}
    </Container>
  )
}
