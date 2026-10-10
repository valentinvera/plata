import { useFocusEffect } from "expo-router"
import { Button, Card, Spinner } from "heroui-native"
import { useCallback, useMemo, useState } from "react"
import { Text, View } from "react-native"

import { Container } from "@/components/container"
import { getCategoryById } from "@/src/features/transactions/categories"
import {
  formatAmount,
  formatDateRange,
} from "@/src/features/transactions/format"
import { useTransactionsInRange } from "@/src/features/transactions/hooks"
import { summarize, weekRange } from "@/src/features/transactions/periods"

export default function WeekScreen() {
  const [now, setNow] = useState(Date.now)
  const range = useMemo(() => weekRange(now), [now])
  const { data, isError, isLoading, refetch } = useTransactionsInRange(range)

  const confirmed = (data ?? []).filter((item) => item.state === "confirmed")
  const summaries = useMemo(() => summarize(confirmed), [confirmed])

  // Refresh the range when the screen regains focus so a week boundary is not missed.
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now())
    }, [])
  )

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

      {isLoading || isError || summaries.length > 0 ? null : (
        <Text className="mt-4 text-muted text-sm">
          No confirmed transactions this week.
        </Text>
      )}

      {isLoading || isError || summaries.length === 0
        ? null
        : summaries.map((summary) => (
            <View key={summary.currency}>
              <Card className="mt-4 p-5">
                <Text className="text-muted text-sm">
                  Spent ({summary.currency})
                </Text>
                <Text className="mt-1 font-bold text-2xl text-foreground">
                  {formatAmount(summary.expense, summary.currency)}
                </Text>
                <Text className="mt-3 text-muted text-sm">Income</Text>
                <Text className="mt-1 font-medium text-foreground">
                  {formatAmount(summary.income, summary.currency)}
                </Text>
              </Card>

              <Card className="mt-4 p-5">
                <Text className="mb-2 font-semibold text-foreground">
                  By category
                </Text>
                {summary.byCategory.length === 0 ? (
                  <Text className="text-muted text-sm">
                    No expenses this week.
                  </Text>
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
                        {formatAmount(item.total, summary.currency)}
                      </Text>
                    </View>
                  ))
                )}
              </Card>
            </View>
          ))}
    </Container>
  )
}
