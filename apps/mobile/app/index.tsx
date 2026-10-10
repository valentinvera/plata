import { router } from "expo-router"
import { Button, Card, Spinner } from "heroui-native"
import { useCallback } from "react"
import { FlatList, Text, View } from "react-native"

import { Container } from "@/components/container"
import { getCategoryById } from "@/src/features/transactions/categories"
import {
  useTransactions,
  useUpdateTransactionState,
} from "@/src/features/transactions/hooks"
import type { Transaction } from "@/src/features/transactions/types"

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

export default function TransactionsScreen() {
  const { data, isError, isLoading, refetch } = useTransactions()
  const updateState = useUpdateTransactionState()
  const transactions = data ?? []

  const suggested = transactions.filter((item) => item.state === "suggested")
  const confirmed = transactions.filter((item) => item.state === "confirmed")

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
    ({ item }: { item: Transaction }) => (
      <Card className="mt-3 p-4">
        <Text className="font-medium text-foreground">
          {item.merchant ?? "No merchant"}
        </Text>
        <Text className="mt-1 text-muted text-xs">
          {getCategoryById(item.categoryId).name} · {item.currency}{" "}
          {formatCents(item.amount)}
        </Text>
      </Card>
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

      {suggested.length > 0 ? (
        <View className="mt-6">
          <Text className="font-semibold text-foreground">To confirm</Text>
          {suggested.map((item) => (
            <Card className="mt-3 p-4" key={item.id}>
              <Text className="font-medium text-foreground">
                {item.merchant ?? "No merchant"}
              </Text>
              <Text className="mt-1 text-muted text-xs">
                {getCategoryById(item.categoryId).name} · {item.currency}{" "}
                {formatCents(item.amount)}
              </Text>
              <Button
                className="mt-3"
                onPress={() => handleConfirm(item.id)}
                size="sm"
              >
                <Button.Label>Confirm</Button.Label>
              </Button>
            </Card>
          ))}
        </View>
      ) : null}

      <Text className="mt-6 font-semibold text-foreground">Confirmed</Text>
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
        <FlatList
          contentContainerClassName="pb-8"
          data={confirmed}
          keyExtractor={keyExtractor}
          ListEmptyComponent={
            <Text className="mt-3 text-muted text-sm">
              No confirmed transactions yet.
            </Text>
          }
          ListHeaderComponent={header}
          renderItem={renderItem}
        />
      )}
    </Container>
  )
}
