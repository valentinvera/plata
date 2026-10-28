import {
  getPendingResultAsync,
  launchImageLibraryAsync,
} from "expo-image-picker"
import { router, useLocalSearchParams } from "expo-router"
import { Button, Card, Chip, Input, Label, TextField } from "heroui-native"
import { useCallback, useEffect, useMemo, useState } from "react"
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
  useCategories,
  useCreateTransaction,
  usePreferences,
} from "@/src/features/transactions/hooks"
import { recognizeTransactionText } from "@/src/features/transactions/ocr-recognize"
import { parseTransactionText } from "@/src/features/transactions/parser"
import { resolveInputAccountId } from "@/src/features/transactions/preferences"
import type { TransactionState } from "@/src/features/transactions/types"

export default function AddTransactionScreen() {
  const params = useLocalSearchParams()
  const [text, setText] = useState(
    typeof params.text === "string" ? params.text : ""
  )
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const createTransaction = useCreateTransaction()
  const { data: accountsData } = useAccounts()
  const { data: categoriesData } = useCategories()
  const { data: preferences, isError: preferencesError } = usePreferences()

  const accounts = accountsData ?? []
  const categories = categoriesData ?? DEFAULT_CATEGORIES
  const selectedAccountId = resolveInputAccountId(
    accountId,
    preferences,
    accounts
  )

  const preview = useMemo(() => {
    const parsed = parseTransactionText(text)
    const categorization = categorize(
      `${text} ${parsed.merchant ?? ""}`,
      categories
    )

    return {
      ...parsed,
      categoryId: categoryOverride ?? categorization.categoryId,
      confidence: categorization.confidence,
    }
  }, [categories, categoryOverride, text])

  // Accounts and preferences load asynchronously. A manual choice can proceed
  // immediately; automatic selection waits for the saved preference to resolve.
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

  const processImage = useCallback(async (uri: string) => {
    setIsImporting(true)
    try {
      const recognized = await recognizeTransactionText(uri)

      if (recognized) {
        setText(recognized)
      } else {
        // Keep whatever is already in the field: it may be typed or shared text,
        // and wiping it here would lose the user's work.
        setError(
          "We could not find a transaction in that image. Your text was left unchanged."
        )
      }
    } catch {
      setError("We could not read that image. Please try again.")
    } finally {
      setIsImporting(false)
    }
  }, [])

  const handleImportScreenshot = useCallback(async () => {
    setError(null)

    const result = await launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    })

    const uri = result.canceled ? null : result.assets[0]?.uri

    if (uri) {
      await processImage(uri)
    }
  }, [processImage])

  // Android can recreate the activity while the picker is open; recover the
  // selected image from the pending result when the screen mounts again.
  useEffect(() => {
    getPendingResultAsync()
      .then((pending) => {
        if (pending && "canceled" in pending && !pending.canceled) {
          const uri = pending.assets[0]?.uri
          return uri ? processImage(uri) : undefined
        }
      })
      .catch(() => undefined)
  }, [processImage])

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

      <Button
        className="mt-2"
        isDisabled={isImporting}
        onPress={handleImportScreenshot}
        variant="outline"
      >
        <Button.Label>
          {isImporting ? "Reading screenshot…" : "Import screenshot"}
        </Button.Label>
      </Button>

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
          Category: {getCategoryById(preview.categoryId, categories).name}
        </Text>
        <Text className="mt-1 text-muted text-xs">
          Confidence: {preview.confidence.toFixed(2)}
        </Text>
      </Card>

      <View className="mt-4">
        <Text className="mb-2 text-muted text-sm">Medio de pago</Text>
        {!selectedAccountId && preferences === undefined ? (
          <Text
            accessibilityLiveRegion="polite"
            className="mb-2 text-muted text-sm"
          >
            {preferencesError
              ? "No pudimos cargar tu medio predeterminado. Elegí uno para continuar."
              : "Cargando tu medio predeterminado…"}
          </Text>
        ) : null}
        <View
          accessibilityLabel="Medio de pago"
          className="flex-row flex-wrap gap-2"
        >
          {accounts.map((account) => (
            <Chip
              accessibilityRole="button"
              accessibilityState={{
                selected: selectedAccountId === account.id,
              }}
              aria-pressed={selectedAccountId === account.id}
              className="min-h-11"
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
          {categories.map((category) => (
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
