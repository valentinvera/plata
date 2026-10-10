import { useFocusEffect } from "expo-router"
import { Button, Card, Input, Label, Spinner, TextField } from "heroui-native"
import { useCallback, useMemo, useState } from "react"
import { Text, View } from "react-native"

import { Container } from "@/components/container"
import {
  type BudgetProgress,
  budgetProgress,
} from "@/src/features/transactions/budget"
import { DEFAULT_CATEGORIES } from "@/src/features/transactions/categories"
import { formatAmount } from "@/src/features/transactions/format"
import {
  useBudgets,
  useSetBudget,
  useTransactionsInRange,
} from "@/src/features/transactions/hooks"
import { parseAmountToCents } from "@/src/features/transactions/parser"
import { monthRange } from "@/src/features/transactions/periods"

const DEFAULT_CURRENCY = "ARS"
const BUDGETABLE_CATEGORIES = DEFAULT_CATEGORIES.filter(
  (category) => category.id !== "income"
)

function formatInputAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

function BudgetRow({ progress }: { progress: BudgetProgress }) {
  const setBudget = useSetBudget()
  const [value, setValue] = useState(
    progress.budget.amount > 0 ? formatInputAmount(progress.budget.amount) : ""
  )
  const [isInvalid, setIsInvalid] = useState(false)

  const { budget, category, ratio, spent } = progress

  const commit = useCallback(() => {
    const trimmed = value.trim()

    if (trimmed === "") {
      setIsInvalid(false)
      setBudget.mutate({ amount: 0, categoryId: category.id })
      return
    }

    const cents = parseAmountToCents(trimmed)
    if (cents === null) {
      setIsInvalid(true)
      return
    }

    setIsInvalid(false)
    setBudget.mutate({ amount: cents, categoryId: category.id })
  }, [category.id, setBudget, value])

  return (
    <Card className="mt-3 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-medium text-foreground">{category.name}</Text>
        <Text className="text-muted text-sm">
          Spent {formatAmount(spent, DEFAULT_CURRENCY)}
        </Text>
      </View>
      <Text className="mt-1 text-muted text-xs">
        {budget.amount > 0
          ? `Limit ${formatAmount(budget.amount, DEFAULT_CURRENCY)} · ${Math.round(ratio * 100)}%`
          : "No limit"}
      </Text>
      <TextField className="mt-2" isInvalid={isInvalid}>
        <Label>Monthly limit</Label>
        <Input
          isInvalid={isInvalid}
          keyboardType="decimal-pad"
          onChangeText={setValue}
          onEndEditing={commit}
          placeholder="No limit"
          value={value}
        />
      </TextField>
      {isInvalid ? (
        <Text className="mt-1 text-destructive text-xs">
          Enter a valid amount
        </Text>
      ) : null}
    </Card>
  )
}

export default function BudgetsScreen() {
  const [now, setNow] = useState(Date.now)
  const range = useMemo(() => monthRange(now), [now])

  const {
    data: transactionsData,
    isError: transactionsError,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useTransactionsInRange(range)
  const {
    data: budgetsData,
    isError: budgetsError,
    isLoading: budgetsLoading,
    refetch: refetchBudgets,
  } = useBudgets()

  // Refresh the range when the screen regains focus so a month boundary is not missed.
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now())
    }, [])
  )

  const isLoading = transactionsLoading || budgetsLoading
  const isError = transactionsError || budgetsError

  const progress = useMemo(() => {
    const confirmed = (transactionsData ?? []).filter(
      (item) => item.state === "confirmed"
    )
    return budgetProgress(
      confirmed,
      BUDGETABLE_CATEGORIES,
      budgetsData ?? [],
      DEFAULT_CURRENCY
    )
  }, [budgetsData, transactionsData])

  const handleRetry = useCallback(async () => {
    await Promise.all([refetchTransactions(), refetchBudgets()])
  }, [refetchBudgets, refetchTransactions])

  return (
    <Container className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">Budgets</Text>
      <Text className="mt-1 pb-2 text-muted text-sm">
        Monthly spending limit per category ({DEFAULT_CURRENCY}).
      </Text>

      {isLoading ? (
        <View className="items-center py-8">
          <Spinner />
        </View>
      ) : null}

      {isError ? (
        <Card className="mt-4 items-center p-6">
          <Text className="text-center font-medium text-foreground">
            Could not load your budgets
          </Text>
          <Button className="mt-3" onPress={handleRetry} size="sm">
            <Button.Label>Retry</Button.Label>
          </Button>
        </Card>
      ) : null}

      {isLoading || isError
        ? null
        : progress.map((item) => (
            <BudgetRow key={item.category.id} progress={item} />
          ))}
    </Container>
  )
}
