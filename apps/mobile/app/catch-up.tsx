import { router } from "expo-router"
import { Button, Card, Input, Label, TextField } from "heroui-native"
import { useCallback, useMemo, useState } from "react"
import { Text, View } from "react-native"

import { Container } from "@/components/container"
import {
  buildCatchUpSuggestions,
  isSuggestionValid,
  splitCatchUpTexts,
} from "@/src/features/transactions/catchup"
import { getCategoryById } from "@/src/features/transactions/categories"
import { formatAmount } from "@/src/features/transactions/format"
import { useCreateTransactions } from "@/src/features/transactions/hooks"
import type {
  NewTransaction,
  TransactionState,
} from "@/src/features/transactions/types"

const PLACEHOLDER =
  "Compraste $12.345,67 en CARREFOUR el 05/09\nPagaste $4.500 en PEDIDOSYA"

export default function CatchUpScreen() {
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const createTransactions = useCreateTransactions()

  const suggestions = useMemo(
    () => buildCatchUpSuggestions(splitCatchUpTexts(text)),
    [text]
  )
  const valid = suggestions.filter(isSuggestionValid)
  const skipped = suggestions.length - valid.length
  const canSave = valid.length > 0 && !createTransactions.isPending

  const handleSave = useCallback(
    async (state: TransactionState) => {
      if (valid.length === 0) {
        return
      }

      setError(null)
      try {
        const inputs: NewTransaction[] = valid.map((suggestion) => ({
          accountId: null,
          amount: suggestion.amount,
          categoryId: suggestion.categoryId,
          confidence: suggestion.confidence,
          currency: suggestion.currency,
          kind: suggestion.kind,
          merchant: suggestion.merchant,
          note: null,
          occurredAt: suggestion.occurredAt ?? Date.now(),
          rawRef: suggestion.raw,
          source: "notification",
          state,
        }))
        await createTransactions.mutateAsync(inputs)
        router.back()
      } catch {
        setError("Could not save the transactions. Please try again.")
      }
    },
    [createTransactions, valid]
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
        Catch up
      </Text>
      <Text className="pb-4 text-muted text-sm">
        Paste everything you missed, one per line, and we parse it in bulk.
      </Text>

      <TextField>
        <Label>Notifications</Label>
        <Input
          multiline
          numberOfLines={6}
          onChangeText={setText}
          placeholder={PLACEHOLDER}
          value={text}
        />
      </TextField>

      <Text className="mt-3 text-muted text-sm">
        {suggestions.length} parsed · {valid.length} ready
        {skipped > 0 ? ` · ${skipped} skipped` : ""}
      </Text>

      {valid.length > 0 ? (
        <Card className="mt-4 p-4">
          {valid.map((suggestion) => (
            <View
              className="mt-1 flex-row items-center justify-between"
              key={suggestion.id}
            >
              <Text className="text-foreground">
                {suggestion.merchant ??
                  getCategoryById(suggestion.categoryId).name}
              </Text>
              <Text className="text-muted text-sm">
                {formatAmount(suggestion.amount, suggestion.currency)}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {error ? (
        <Text className="mt-4 text-destructive text-sm">{error}</Text>
      ) : null}

      <View className="mt-6 gap-3 pb-4">
        <Button isDisabled={!canSave} onPress={handleConfirmed}>
          <Button.Label>Confirm all</Button.Label>
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
