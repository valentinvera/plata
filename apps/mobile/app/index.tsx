import { router } from "expo-router"
import { Button, Card, Spinner } from "heroui-native"
import { useCallback } from "react"
import { SectionList, Text, View } from "react-native"

import { Container } from "@/components/container"
import { getCategoryById } from "@/src/features/transactions/categories"
import { formatAmount } from "@/src/features/transactions/format"
import {
  useTransactions,
  useUpdateTransactionState,
} from "@/src/features/transactions/hooks"
import type { Transaction } from "@/src/features/transactions/types"

interface TransactionSection {
  data: Transaction[]
  title: string
  type: "suggested" | "confirmed"
}

export default function TransactionsScreen() {
  const { data, isError, isLoading, refetch } = useTransactions()
  const updateState = useUpdateTransactionState()
  const transactions = data ?? []

  const sections: TransactionSection[] = [
    {
      data: transactions.filter((item) => item.state === "suggested"),
      title: "To confirm",
      type: "suggested",
    },
    {
      data: transactions.filter((item) => item.state === "confirmed"),
      title: "Confirmed",
      type: "confirmed",
    },
  ]

  const handleRetry = useCallback(async () => {
    await refetch()
  }, [refetch])

  const handleAdd = useCallback(() => {
    router.push("/add-transaction")
  }, [])

  const handleConfirm = useCallback(
    (id: string) => {
      updateState.mutate({ id, state: "confirmed" })
    },
    [updateState]
  )

  const renderItem = useCallback(
    ({ item, section }: { item: Transaction; section: TransactionSection }) => {
      const category = getCategoryById(item.categoryId).name
      const amount = formatAmount(item.amount, item.currency)

      return (
        <Card className="mt-3 p-4">
          <Text className="font-medium text-foreground">
            {item.merchant ?? "No merchant"}
          </Text>
          <Text className="mt-1 text-muted text-xs">
            {category} · {amount}
          </Text>
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
    [handleConfirm]
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
