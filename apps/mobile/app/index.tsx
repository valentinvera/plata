import { Redirect, router } from "expo-router"
import { Button, Card, Chip, Spinner } from "heroui-native"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
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
import { getCategoryById } from "@/src/features/transactions/categories"
import { formatAmount } from "@/src/features/transactions/format"
import {
  useAccounts,
  useAppMeta,
  useConfirmedTransactions,
  useSuggestedTransactions,
  useUpdateTransactionState,
} from "@/src/features/transactions/hooks"
import {
  ONBOARDING_COMPLETED_KEY,
  shouldShowOnboarding,
} from "@/src/features/transactions/onboarding"
import type { Transaction } from "@/src/features/transactions/types"

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
      const category = getCategoryById(item.categoryId).name
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
    [accounts, handleConfirm, handleOpen]
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
      <Button className="mt-4" onPress={handleAdd}>
        <Button.Label>Add transaction</Button.Label>
      </Button>
      <Button className="mt-2" onPress={handleWeek} variant="outline">
        <Button.Label>This week</Button.Label>
      </Button>
      <Button className="mt-2" onPress={handleSearch} variant="outline">
        <Button.Label>Search</Button.Label>
      </Button>
      <Button className="mt-2" onPress={handleCatchUp} variant="outline">
        <Button.Label>Catch up</Button.Label>
      </Button>
      <Button className="mt-2" onPress={handleBudgets} variant="outline">
        <Button.Label>Budgets</Button.Label>
      </Button>
      <Button className="mt-2" onPress={handleCategories} variant="outline">
        <Button.Label>Categories</Button.Label>
      </Button>
      <Button className="mt-2" onPress={handleAccounts} variant="outline">
        <Button.Label>Accounts</Button.Label>
      </Button>
      <Button className="mt-2" onPress={handleAccount} variant="outline">
        <Button.Label>Account</Button.Label>
      </Button>
      <Button className="mt-2" onPress={handlePreferences} variant="outline">
        <Button.Label>Preferences</Button.Label>
      </Button>
      {Platform.OS === "android" ? (
        <Button
          className="mt-2"
          onPress={handleNotifications}
          variant="outline"
        >
          <Button.Label>Automatic import</Button.Label>
        </Button>
      ) : null}

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
