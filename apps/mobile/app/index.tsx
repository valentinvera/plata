import { useFonts } from "expo-font"
import { Redirect, router, useFocusEffect } from "expo-router"
import { Button, Card, Spinner } from "heroui-native"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AppState, SectionList, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Container } from "@/components/container"
import {
  EmptyState,
  type HomeActions,
  HomeHeader,
  HomeSectionHeader,
  homeFonts,
  homeStyles,
  MoreSection,
  TransactionRow,
} from "@/src/features/home/components"
import {
  buildHomeSections,
  type TransactionSection,
} from "@/src/features/home/sections"
import {
  ALL_ACCOUNTS,
  getAccountName,
  NO_ACCOUNT,
} from "@/src/features/transactions/accounts"
import {
  DEFAULT_CATEGORIES,
  getCategoryById,
} from "@/src/features/transactions/categories"
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

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets()
  const [fontsLoaded, fontError] = useFonts(homeFonts)
  const [accountFilter, setAccountFilter] = useState(ALL_ACCOUNTS)
  const [amountsHidden, setAmountsHidden] = useState(false)

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

  const actions = useMemo<HomeActions>(
    () => ({
      account: () => router.push("/account"),
      accounts: () => router.push("/accounts"),
      add: () => router.push("/add-transaction"),
      budgets: () => router.push("/budgets"),
      categories: () => router.push("/categories"),
      catchUp: () => router.push("/catch-up"),
      duplicates: () => router.push("/duplicates"),
      exportData: () => router.push("/export"),
      insights: () => router.push("/insights"),
      notifications: () => router.push("/notifications"),
      preferences: () => router.push("/preferences"),
      recurring: () => router.push("/recurring"),
      search: () => router.push("/search"),
      week: () => router.push("/week"),
    }),
    []
  )

  const isLoading = suggestedLoading || confirmedLoading
  const isError = suggestedError || confirmedError

  const sections = useMemo(
    () =>
      buildHomeSections({
        suggested: suggestedData ?? [],
        confirmed: confirmedData ?? [],
        now,
      }),
    [confirmedData, suggestedData, now]
  )

  const changeTone =
    highlights.monthExpenseChangeRatio !== null &&
    highlights.monthExpenseChangeRatio < 0
      ? "text-accent"
      : "text-muted"

  const handleRetry = useCallback(async () => {
    await Promise.all([refetchSuggested(), refetchConfirmed()])
  }, [refetchConfirmed, refetchSuggested])

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
    ({ item, section }: { item: Transaction; section: TransactionSection }) => (
      <TransactionRow
        accountName={getAccountName(accounts, item.accountId)}
        amountsHidden={amountsHidden}
        categoryName={getCategoryById(item.categoryId, allCategories).name}
        confirmationPending={updateState.isPending}
        confirming={
          updateState.isPending && updateState.variables?.id === item.id
        }
        item={item}
        onConfirm={handleConfirm}
        onOpen={handleOpen}
        suggested={section.type === "suggested"}
      />
    ),
    [
      accounts,
      amountsHidden,
      allCategories,
      handleConfirm,
      handleOpen,
      updateState.isPending,
      updateState.variables?.id,
    ]
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: TransactionSection }) => (
      <HomeSectionHeader section={section} />
    ),
    []
  )

  const keyExtractor = useCallback((item: Transaction) => item.id, [])

  if (onboardingLoading || !(fontsLoaded || fontError)) {
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
    <Container
      className="px-4"
      isScrollable={false}
      style={{ paddingTop: insets.top }}
    >
      {updateState.isError ? (
        <View accessibilityLiveRegion="polite" className="py-3">
          <Text
            className="text-center text-foreground text-sm"
            style={homeStyles.medium}
          >
            No pudimos confirmar el movimiento. Probá de nuevo.
          </Text>
        </View>
      ) : null}
      {isLoading ? (
        <View className="items-center py-8">
          <Spinner />
        </View>
      ) : null}

      {isError ? (
        <Card className="mt-4 items-center p-6">
          <Text className="text-center font-medium text-foreground">
            No pudimos cargar tus movimientos
          </Text>
          <Button className="mt-3" onPress={handleRetry} size="sm">
            <Button.Label>Reintentar</Button.Label>
          </Button>
        </Card>
      ) : null}

      {isLoading || isError ? null : (
        <SectionList
          contentContainerStyle={homeStyles.content}
          contentInsetAdjustmentBehavior="automatic"
          extraData={amountsHidden}
          keyExtractor={keyExtractor}
          ListEmptyComponent={
            <EmptyState
              filtered={accountFilter !== ALL_ACCOUNTS}
              onAction={
                accountFilter === ALL_ACCOUNTS
                  ? actions.add
                  : () => setAccountFilter(ALL_ACCOUNTS)
              }
            />
          }
          ListFooterComponent={
            <MoreSection actions={actions} highlights={highlights} />
          }
          ListHeaderComponent={
            <HomeHeader
              accountFilter={accountFilter}
              accounts={accounts}
              actions={actions}
              amountsHidden={amountsHidden}
              changeTone={changeTone}
              highlights={highlights}
              month={now}
              onSelectAccount={setAccountFilter}
              onToggleAmounts={() => setAmountsHidden((hidden) => !hidden)}
            />
          }
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          sections={sections}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </Container>
  )
}
