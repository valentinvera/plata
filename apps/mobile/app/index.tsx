import { Button, Card, Spinner } from "heroui-native"
import { useCallback } from "react"
import { FlatList, Text, View } from "react-native"

import { Container } from "@/components/container"
import { useTransactions } from "@/src/features/transactions/hooks"
import type { Transaction } from "@/src/features/transactions/types"

export default function TransactionsScreen() {
  const { data, isError, isLoading, refetch } = useTransactions()
  const transactions = data ?? []

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <Card className="mt-3 p-4">
        <Text className="font-medium text-foreground">
          {item.merchant ?? "No merchant"}
        </Text>
        <Text className="mt-1 text-muted text-xs">
          {item.state} · {item.currency} {(item.amount / 100).toFixed(2)}
        </Text>
      </Card>
    ),
    []
  )

  const keyExtractor = useCallback((item: Transaction) => item.id, [])

  const handleRetry = useCallback(async () => {
    await refetch()
  }, [refetch])

  return (
    <Container className="px-5" isScrollable={false}>
      <View className="pt-3 pb-4">
        <Text className="font-bold text-2xl text-foreground">Plata</Text>
        <Text className="mt-1 text-muted text-sm">Your transactions</Text>
      </View>

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
        <View className="flex-1">
          <FlatList
            contentContainerClassName="pb-8"
            data={transactions}
            keyExtractor={keyExtractor}
            ListEmptyComponent={
              <Card className="mt-4 items-center p-6">
                <Text className="text-center font-medium text-foreground">
                  No transactions yet
                </Text>
                <Text className="mt-1 text-center text-muted text-xs">
                  Your transactions will show up here.
                </Text>
              </Card>
            }
            renderItem={renderItem}
          />
        </View>
      )}
    </Container>
  )
}
