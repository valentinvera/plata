import { Button, Card, Spinner } from "heroui-native"
import { useMemo } from "react"
import { Text, View } from "react-native"

import { Container } from "@/components/container"
import {
  DEFAULT_CATEGORIES,
  getCategoryById,
} from "@/src/features/transactions/categories"
import { formatAmount, formatDay } from "@/src/features/transactions/format"
import {
  useAllTransactions,
  useCategories,
} from "@/src/features/transactions/hooks"
import {
  detectRecurring,
  type RecurringCadence,
} from "@/src/features/transactions/recurring"

const CADENCE_LABELS: Record<RecurringCadence, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
}

export default function RecurringScreen() {
  const { data, isError, isLoading, refetch } = useAllTransactions()
  const { data: categoriesData } = useCategories()
  const categories = categoriesData ?? DEFAULT_CATEGORIES

  const recurring = useMemo(
    () =>
      detectRecurring(
        (data ?? []).filter((transaction) => transaction.state === "confirmed")
      ),
    [data]
  )

  return (
    <Container className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">Recurring</Text>
      <Text className="mt-1 text-muted text-sm">
        Subscriptions and bills detected from your transaction history.
      </Text>

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
          <Button className="mt-3" onPress={() => refetch()} size="sm">
            <Button.Label>Retry</Button.Label>
          </Button>
        </Card>
      ) : null}

      {!(isLoading || isError) && recurring.length === 0 ? (
        <Text className="mt-4 text-muted text-sm">
          No recurring payments detected yet.
        </Text>
      ) : null}

      {recurring.map((payment) => (
        <Card
          className="mt-3 p-4"
          key={`${payment.merchant}|${payment.currency}`}
        >
          <View className="flex-row items-center justify-between">
            <Text
              className="flex-1 font-medium text-foreground"
              numberOfLines={1}
            >
              {payment.merchant || "No merchant"}
            </Text>
            <Text className="ml-3 text-foreground">
              {formatAmount(payment.averageAmount, payment.currency)}
            </Text>
          </View>
          <Text className="mt-1 text-muted text-xs">
            {CADENCE_LABELS[payment.cadence]} · {payment.occurrences} payments ·{" "}
            {getCategoryById(payment.categoryId, categories).name}
          </Text>
          <Text className="mt-1 text-muted text-xs">
            Last: {formatDay(payment.lastOccurredAt)}
          </Text>
        </Card>
      ))}
    </Container>
  )
}
