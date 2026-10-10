import { Button, Card, Spinner } from "heroui-native"
import { useCallback, useMemo, useState } from "react"
import { Text, View } from "react-native"

import { Container } from "@/components/container"
import { getCategoryById } from "@/src/features/transactions/categories"
import {
  formatAmount,
  formatDateRange,
} from "@/src/features/transactions/format"
import { useTransactions } from "@/src/features/transactions/hooks"
import {
  isWithinRange,
  summarize,
  weekRange,
} from "@/src/features/transactions/periods"

const DEFAULT_CURRENCY = "ARS"

export default function WeekScreen() {
  const { data, isError, isLoading, refetch } = useTransactions()
  const [now] = useState(Date.now)
  const transactions = data ?? []

  const range = useMemo(() => weekRange(now), [now])
  const weekTransactions = useMemo(
    () =>
      transactions.filter(
        (item) => item.state === "confirmed" && isWithinRange(item, range)
      ),
    [range, transactions]
  )
  const summary = useMemo(() => summarize(weekTransactions), [weekTransactions])

  const handleRetry = useCallback(async () => {
    await refetch()
  }, [refetch])

  return (
    <Container className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">This week</Text>
      <Text className="mt-1 text-muted text-sm">{formatDateRange(range)}</Text>

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
        <>
          <Card className="mt-4 p-5">
            <Text className="text-muted text-sm">Spent</Text>
            <Text className="mt-1 font-bold text-2xl text-foreground">
              {formatAmount(summary.expense, DEFAULT_CURRENCY)}
            </Text>
            <Text className="mt-3 text-muted text-sm">Income</Text>
            <Text className="mt-1 font-medium text-foreground">
              {formatAmount(summary.income, DEFAULT_CURRENCY)}
            </Text>
          </Card>

          <Card className="mt-4 p-5">
            <Text className="mb-2 font-semibold text-foreground">
              By category
            </Text>
            {summary.byCategory.length === 0 ? (
              <Text className="text-muted text-sm">No expenses this week.</Text>
            ) : (
              summary.byCategory.map((item) => (
                <View
                  className="mt-2 flex-row items-center justify-between"
                  key={item.categoryId}
                >
                  <Text className="text-foreground">
                    {getCategoryById(item.categoryId).name}
                  </Text>
                  <Text className="text-muted text-sm">
                    {formatAmount(item.total, DEFAULT_CURRENCY)}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </Container>
  )
}
