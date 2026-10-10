import { router, useLocalSearchParams } from "expo-router"
import { Button, Card, Chip, Input, Label, TextField } from "heroui-native"
import { useCallback, useMemo, useState } from "react"
import { ScrollView, Text, View } from "react-native"

import { Container } from "@/components/container"
import {
  DEFAULT_CATEGORIES,
  getCategoryById,
} from "@/src/features/transactions/categories"
import { categorize } from "@/src/features/transactions/categorizer"
import { formatAmount } from "@/src/features/transactions/format"
import {
  useAccounts,
  useCreateTransaction,
} from "@/src/features/transactions/hooks"
import { parseTransactionText } from "@/src/features/transactions/parser"
import type { TransactionState } from "@/src/features/transactions/types"

export default function AddTransactionScreen() {
  const params = useLocalSearchParams()
  const [text, setText] = useState(
    typeof params.text === "string" ? params.text : ""
  )
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const createTransaction = useCreateTransaction()
  const { data: accountsData } = useAccounts()

  const accounts = accountsData ?? []
  const selectedAccountId = accountId ?? accounts[0]?.id ?? null

  const preview = useMemo(() => {
    const parsed = parseTransactionText(text)
    const categorization = categorize(`${text} ${parsed.merchant ?? ""}`)

    return {
      ...parsed,
      categoryId: categoryOverride ?? categorization.categoryId,
      confidence: categorization.confidence,
    }
  }, [categoryOverride, text])

  // Accounts load asynchronously; require a resolved account so a transaction is
  // never stored without one (e.g. saving right after a share intent cold open).
  const canSave =
    preview.amount !== null &&
    preview.amount > 0 &&
    selectedAccountId !== null &&
    !createTransaction.isPending

  const handleSave = useCallback(
    async (state: TransactionState) => {
      if (
        preview.amount === null ||
        preview.amount <= 0 ||
        selectedAccountId === null
      ) {
        return
      }

      setError(null)
      try {
        await createTransaction.mutateAsync({
          accountId: selectedAccountId,
          amount: preview.amount,
          categoryId: preview.categoryId,
          confidence: preview.confidence,
          currency: preview.currency,
          kind: preview.kind,
          merchant: preview.merchant,
          note: null,
          occurredAt: preview.occurredAt ?? Date.now(),
          rawRef: text.trim() || null,
          source: "manual",
          state,
        })
        router.back()
      } catch {
        setError("Could not save the transaction. Please try again.")
      }
    },
    [createTransaction, preview, selectedAccountId, text]
  )

  const handleConfirmed = useCallback(async () => {
    await handleSave("confirmed")
  }, [handleSave])

  const handleSuggested = useCallback(async () => {
    await handleSave("suggested")
  }, [handleSave])

  return (
    <Container className="px-5">
      <Text className="pt-3 pb-2 font-bold text-2xl text-foreground">
        Add transaction
      </Text>
      <Text className="pb-4 text-muted text-sm">
        Paste a notification or screenshot caption and we parse it.
      </Text>

      <TextField>
        <Label>Notification text</Label>
        <Input
          multiline
          numberOfLines={3}
          onChangeText={setText}
          placeholder="Compraste $12.345,67 en CARREFOUR el 05/09"
          value={text}
        />
      </TextField>

      <Card className="mt-4 p-4">
        <Text className="font-semibold text-foreground">Preview</Text>
        <Text className="mt-2 text-foreground">
          Amount:{" "}
          {preview.amount === null
            ? "—"
            : formatAmount(preview.amount, preview.currency)}
        </Text>
        <Text className="text-foreground">
          Merchant: {preview.merchant ?? "—"}
        </Text>
        <Text className="text-foreground">
          Category: {getCategoryById(preview.categoryId).name}
        </Text>
        <Text className="mt-1 text-muted text-xs">
          Confidence: {preview.confidence.toFixed(2)}
        </Text>
      </Card>

      <View className="mt-4">
        <Text className="mb-2 text-muted text-sm">Account</Text>
        <View className="flex-row flex-wrap gap-2">
          {accounts.map((account) => (
            <Chip
              key={account.id}
              onPress={() => setAccountId(account.id)}
              variant={selectedAccountId === account.id ? "primary" : "soft"}
            >
              <Chip.Label>{account.name}</Chip.Label>
            </Chip>
          ))}
        </View>
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-muted text-sm">Category</Text>
        <ScrollView
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {DEFAULT_CATEGORIES.map((category) => (
            <Chip
              key={category.id}
              onPress={() => setCategoryOverride(category.id)}
              variant={preview.categoryId === category.id ? "primary" : "soft"}
            >
              <Chip.Label>{category.name}</Chip.Label>
            </Chip>
          ))}
        </ScrollView>
      </View>

      {error ? (
        <Text className="mt-4 text-destructive text-sm">{error}</Text>
      ) : null}

      <View className="mt-6 gap-3 pb-4">
        <Button isDisabled={!canSave} onPress={handleConfirmed}>
          <Button.Label>Save as confirmed</Button.Label>
        </Button>
        <Button
          isDisabled={!canSave}
          onPress={handleSuggested}
          variant="outline"
        >
          <Button.Label>Save to confirm later</Button.Label>
        </Button>
      </View>
    </Container>
  )
}
