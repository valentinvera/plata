import { useFocusEffect } from "expo-router"
import { Button, Card, Spinner } from "heroui-native"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AppState, Text, View } from "react-native"

import { Container } from "@/components/container"
import {
  DEFAULT_CATEGORIES,
  getCategoryById,
} from "@/src/features/transactions/categories"
import { formatAmount, formatDay } from "@/src/features/transactions/format"
import {
  useCategories,
  useTransactionsInRange,
} from "@/src/features/transactions/hooks"
import {
  type CategoryChange,
  categoryChanges,
  comparePeriods,
  largestExpenses,
} from "@/src/features/transactions/insights"
import { monthRange } from "@/src/features/transactions/periods"
import type { Currency } from "@/src/features/transactions/types"

const TOP_MOVERS = 5
const TOP_EXPENSES = 5

function changeLabel(ratio: number | null): string {
  if (ratio === null) {
    return "No spending last month to compare"
  }

  const percent = Math.round(ratio * 100)

  if (percent === 0) {
    return "Same as last month"
  }

  return percent > 0
    ? `+${percent}% vs last month`
    : `${percent}% vs last month`
}

function DeltaRow({
  change,
  currency,
  name,
}: {
  change: CategoryChange
  currency: Currency
  name: string
}) {
  return (
    <View className="mt-2 flex-row items-center justify-between">
      <Text className="flex-1 text-foreground" numberOfLines={1}>
        {name}
      </Text>
      <Text
        className={
          change.delta > 0
            ? "ml-3 text-destructive text-sm"
            : "ml-3 text-muted text-sm"
        }
      >
        {change.delta > 0 ? "+" : "−"}
        {formatAmount(Math.abs(change.delta), currency)}
      </Text>
    </View>
  )
}

export default function InsightsScreen() {
  const [now, setNow] = useState(Date.now)
  const currentMonth = useMemo(() => monthRange(now), [now])
  const previousMonth = useMemo(
    () => monthRange(currentMonth.start - 1),
    [currentMonth.start]
  )
  const current = useTransactionsInRange(currentMonth)
  const previous = useTransactionsInRange(previousMonth)
  const { data: categoriesData } = useCategories()
  const categories = categoriesData ?? DEFAULT_CATEGORIES

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

  const confirmedCurrent = useMemo(
    () => (current.data ?? []).filter((item) => item.state === "confirmed"),
    [current.data]
  )
  const confirmedPrevious = useMemo(
    () => (previous.data ?? []).filter((item) => item.state === "confirmed"),
    [previous.data]
  )

  const comparisons = useMemo(
    () =>
      comparePeriods(confirmedCurrent, confirmedPrevious).filter(
        (comparison) =>
          comparison.currentExpense > 0 || comparison.previousExpense > 0
      ),
    [confirmedCurrent, confirmedPrevious]
  )

  const isLoading = current.isLoading || previous.isLoading
  const isError = current.isError || previous.isError

  const handleRetry = useCallback(async () => {
    await Promise.all([current.refetch(), previous.refetch()])
  }, [current, previous])

  return (
    <Container className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">Insights</Text>
      <Text className="mt-1 text-muted text-sm">
        This month compared to the previous one.
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
          <Button className="mt-3" onPress={handleRetry} size="sm">
            <Button.Label>Retry</Button.Label>
          </Button>
        </Card>
      ) : null}

      {isLoading || isError || comparisons.length > 0 ? null : (
        <Text className="mt-4 text-muted text-sm">
          No spending recorded in the last two months.
        </Text>
      )}

      {isLoading || isError
        ? null
        : comparisons.map((comparison) => {
            const { currency } = comparison
            const movers = categoryChanges(
              confirmedCurrent,
              confirmedPrevious,
              currency
            )
              .filter((change) => change.delta !== 0)
              .slice(0, TOP_MOVERS)
            const largest = largestExpenses(
              confirmedCurrent,
              currency,
              TOP_EXPENSES
            )

            return (
              <View key={currency}>
                <Card className="mt-4 p-5">
                  <Text className="text-muted text-sm">Spent ({currency})</Text>
                  <Text className="mt-1 font-bold text-2xl text-foreground">
                    {formatAmount(comparison.currentExpense, currency)}
                  </Text>
                  <Text className="mt-1 text-muted text-xs">
                    {changeLabel(comparison.expenseChangeRatio)} · last month{" "}
                    {formatAmount(comparison.previousExpense, currency)}
                  </Text>
                </Card>

                <Card className="mt-4 p-5">
                  <Text className="mb-2 font-semibold text-foreground">
                    Biggest changes
                  </Text>
                  {movers.length === 0 ? (
                    <Text className="text-muted text-sm">
                      No changes vs last month.
                    </Text>
                  ) : (
                    movers.map((change) => (
                      <DeltaRow
                        change={change}
                        currency={currency}
                        key={change.categoryId}
                        name={
                          getCategoryById(change.categoryId, categories).name
                        }
                      />
                    ))
                  )}
                </Card>

                <Card className="mt-4 p-5">
                  <Text className="mb-2 font-semibold text-foreground">
                    Largest expenses
                  </Text>
                  {largest.length === 0 ? (
                    <Text className="text-muted text-sm">
                      No expenses this month.
                    </Text>
                  ) : (
                    largest.map((transaction) => (
                      <View
                        className="mt-2 flex-row items-center justify-between"
                        key={transaction.id}
                      >
                        <View className="flex-1">
                          <Text className="text-foreground" numberOfLines={1}>
                            {transaction.merchant ??
                              getCategoryById(
                                transaction.categoryId,
                                categories
                              ).name}
                          </Text>
                          <Text className="text-muted text-xs">
                            {formatDay(transaction.occurredAt)}
                          </Text>
                        </View>
                        <Text className="ml-3 text-foreground">
                          {formatAmount(transaction.amount, currency)}
                        </Text>
                      </View>
                    ))
                  )}
                </Card>
              </View>
            )
          })}
    </Container>
  )
}
