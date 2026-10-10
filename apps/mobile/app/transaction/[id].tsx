import { router, useLocalSearchParams } from "expo-router"
import { Button, Chip, Input, Label, Spinner, TextField } from "heroui-native"
import { useCallback, useState } from "react"
import { ScrollView, Text, View } from "react-native"

import { Container } from "@/components/container"
import { DEFAULT_CATEGORIES } from "@/src/features/transactions/categories"
import {
  formatAmountInput,
  parseAmountInput,
} from "@/src/features/transactions/format"
import {
  useAccounts,
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from "@/src/features/transactions/hooks"
import type { Transaction } from "@/src/features/transactions/types"

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: transaction, isError, isLoading } = useTransaction(id)

  if (isLoading) {
    return (
      <Container className="px-5">
        <View className="items-center py-8">
          <Spinner />
        </View>
      </Container>
    )
  }

  if (isError || !transaction) {
    return (
      <Container className="px-5">
        <Text className="pt-3 text-muted text-sm">
          Could not load this transaction.
        </Text>
      </Container>
    )
  }

  return <TransactionForm transaction={transaction} />
}

function TransactionForm({ transaction }: { transaction: Transaction }) {
  const [amountInput, setAmountInput] = useState(
    formatAmountInput(transaction.amount)
  )
  const [merchant, setMerchant] = useState(transaction.merchant ?? "")
  const [categoryId, setCategoryId] = useState(transaction.categoryId)
  const [accountId, setAccountId] = useState(transaction.accountId)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data: accountsData } = useAccounts()
  const accounts = accountsData ?? []
  const update = useUpdateTransaction()
  const remove = useDeleteTransaction()

  const amount = parseAmountInput(amountInput)
  const isBusy = update.isPending || remove.isPending
  const canSave = amount !== null && amount > 0 && !isBusy

  const handleSave = useCallback(async () => {
    if (amount === null || amount <= 0) {
      return
    }

    setError(null)
    try {
      await update.mutateAsync({
        id: transaction.id,
        update: {
          accountId,
          amount,
          categoryId,
          merchant: merchant.trim() || null,
        },
      })
      router.back()
    } catch {
      setError("Could not save the changes. Please try again.")
    }
  }, [accountId, amount, categoryId, merchant, transaction.id, update])

  const handleDelete = useCallback(async () => {
    setError(null)
    try {
      await remove.mutateAsync(transaction.id)
      router.back()
    } catch {
      setError("Could not delete the transaction. Please try again.")
    }
  }, [remove, transaction.id])

  return (
    <Container className="px-5">
      <Text className="pt-3 pb-4 font-bold text-2xl text-foreground">
        Edit transaction
      </Text>

      <TextField>
        <Label>Amount</Label>
        <Input
          keyboardType="decimal-pad"
          onChangeText={setAmountInput}
          placeholder="0,00"
          value={amountInput}
        />
      </TextField>

      <View className="mt-4">
        <TextField>
          <Label>Merchant</Label>
          <Input
            onChangeText={setMerchant}
            placeholder="Carrefour"
            value={merchant}
          />
        </TextField>
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-muted text-sm">Category</Text>
        <ScrollView
          accessibilityRole="radiogroup"
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {DEFAULT_CATEGORIES.map((category) => (
            <Chip
              accessibilityRole="radio"
              accessibilityState={{ selected: categoryId === category.id }}
              key={category.id}
              onPress={() => setCategoryId(category.id)}
              variant={categoryId === category.id ? "primary" : "soft"}
            >
              <Chip.Label>{category.name}</Chip.Label>
            </Chip>
          ))}
        </ScrollView>
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-muted text-sm">Account</Text>
        <View
          accessibilityRole="radiogroup"
          className="flex-row flex-wrap gap-2"
        >
          {accounts.map((account) => (
            <Chip
              accessibilityRole="radio"
              accessibilityState={{ selected: accountId === account.id }}
              key={account.id}
              onPress={() => setAccountId(account.id)}
              variant={accountId === account.id ? "primary" : "soft"}
            >
              <Chip.Label>{account.name}</Chip.Label>
            </Chip>
          ))}
        </View>
      </View>

      {error ? (
        <Text className="mt-4 text-destructive text-sm">{error}</Text>
      ) : null}

      <View className="mt-6 gap-3 pb-4">
        <Button isDisabled={!canSave} onPress={handleSave}>
          <Button.Label>Save changes</Button.Label>
        </Button>

        {confirmingDelete ? (
          <>
            <Text className="text-destructive text-sm">
              Delete this transaction? This cannot be undone.
            </Text>
            <Button
              isDisabled={isBusy}
              onPress={handleDelete}
              variant="outline"
            >
              <Button.Label>Yes, delete</Button.Label>
            </Button>
            <Button
              isDisabled={isBusy}
              onPress={() => setConfirmingDelete(false)}
              variant="outline"
            >
              <Button.Label>Cancel</Button.Label>
            </Button>
          </>
        ) : (
          <Button
            isDisabled={isBusy}
            onPress={() => setConfirmingDelete(true)}
            variant="outline"
          >
            <Button.Label>Delete</Button.Label>
          </Button>
        )}
      </View>
    </Container>
  )
}
