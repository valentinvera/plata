import { Card, Spinner } from "heroui-native"
import { Text, View } from "react-native"

import { Container } from "@/components/container"
import { useTransactions } from "@/src/features/transactions/hooks"

export default function TransactionsScreen() {
  const { data, isLoading } = useTransactions()
  const transactions = data ?? []

  return (
    <Container className="px-5">
      <View className="pt-3 pb-4">
        <Text className="font-bold text-2xl text-foreground">Plata</Text>
        <Text className="mt-1 text-muted text-sm">Your transactions</Text>
      </View>

      {isLoading ? (
        <View className="items-center py-8">
          <Spinner />
        </View>
      ) : null}

      {!isLoading && transactions.length === 0 ? (
        <Card className="items-center p-6">
          <Text className="text-center font-medium text-foreground">
            No transactions yet
          </Text>
          <Text className="mt-1 text-center text-muted text-xs">
            Your transactions will show up here.
          </Text>
        </Card>
      ) : null}

      {transactions.map((transaction) => (
        <Card className="mt-3 p-4" key={transaction.id}>
          <Text className="font-medium text-foreground">
            {transaction.merchant ?? "No merchant"}
          </Text>
          <Text className="mt-1 text-muted text-xs">
            {transaction.state} · {transaction.currency}{" "}
            {(transaction.amount / 100).toFixed(2)}
          </Text>
        </Card>
      ))}
    </Container>
  )
}
