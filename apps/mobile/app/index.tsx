import { router } from "expo-router"
import { Button, Card, Spinner } from "heroui-native"
import { useCallback, useMemo } from "react"
import { Pressable, SectionList, Text, View } from "react-native"

import { Container } from "@/components/container"
import { getAccountName } from "@/src/features/transactions/accounts"
import { getCategoryById } from "@/src/features/transactions/categories"
import { formatAmount } from "@/src/features/transactions/format"
import {
  useAccounts,
  useConfirmedTransactions,
  useSuggestedTransactions,
  useUpdateTransactionState,
} from "@/src/features/transactions/hooks"
import type { Transaction } from "@/src/features/transactions/types"

interface TransactionSection {
  data: Transaction[]
  title: string
  type: "suggested" | "confirmed"
}

export default function TransactionsScreen() {
  const {
    data: suggestedData,
    isError: suggestedError,
    isLoading: suggestedLoading,
    refetch: refetchSuggested,
  } = useSuggestedTransactions()
  const {
    data: confirmedData,
    isError: confirmedError,
    isLoading: confirmedLoading,
    refetch: refetchConfirmed,
  } = useConfirmedTransactions()
  const updateState = useUpdateTransactionState()
  const { data: accountsData } = useAccounts()

  const accounts = useMemo(() => accountsData ?? [], [accountsData])

  const isLoading = suggestedLoading || confirmedLoading
  const isError = suggestedError || confirmedError

  const sections: TransactionSection[] = [
    { data: suggestedData ?? [], title: "To confirm", type: "suggested" },
    { data: confirmedData ?? [], title: "Confirmed", type: "confirmed" },
  ]

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
    ({ section }: { section: TransactionSection }) => {
      if (section.data.length === 0) {
        return null
      }

      return (
        <Text className="mt-6 font-semibold text-foreground">
          {section.title}
        </Text>
      )
    },
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
      <Button className="mt-2" onPress={handleCatchUp} variant="outline">
        <Button.Label>Catch up</Button.Label>
      </Button>
      <Button className="mt-2" onPress={handleBudgets} variant="outline">
        <Button.Label>Budgets</Button.Label>
      </Button>
    </View>
  )

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
              No transactions yet.
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
