import { router } from "expo-router"
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  Spinner,
  TextField,
} from "heroui-native"
import { useCallback, useEffect, useRef, useState } from "react"
import { ScrollView, Text, View } from "react-native"

import { Container } from "@/components/container"
import {
  useAccounts,
  usePreferences,
  useSetPreferences,
} from "@/src/features/transactions/hooks"
import type { PrivacyMode } from "@/src/features/transactions/preferences"

const PRIVACY_LABELS: Record<PrivacyMode, string> = {
  local_only: "Local only",
  sync: "Sync",
}

function parseWeight(value: string): number | null {
  const trimmed = value.trim()

  if (trimmed === "") {
    return 0
  }

  const number = Number(trimmed.replace(",", "."))

  return Number.isFinite(number) && number >= 0 ? number : null
}

function OptionChip({
  disabled,
  label,
  onPress,
  selected,
}: {
  disabled?: boolean
  label: string
  onPress: () => void
  selected: boolean
}) {
  return (
    <Chip
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      variant={selected ? "primary" : "soft"}
    >
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  )
}

export default function PreferencesScreen() {
  const { data: preferences, isLoading } = usePreferences()
  const { data: accountsData } = useAccounts()
  const setPreferences = useSetPreferences()
  const accounts = accountsData ?? []

  const [cash, setCash] = useState("0")
  const [card, setCard] = useState("0")
  const [transfer, setTransfer] = useState("0")
  const [mixError, setMixError] = useState<string | null>(null)
  const initialized = useRef(false)

  // Seed the draft only on the first load: unrelated preference updates (e.g.
  // choosing a default account) must not discard unsaved weights.
  useEffect(() => {
    if (!preferences || initialized.current) {
      return
    }

    setCash(String(preferences.paymentMix.cash))
    setCard(String(preferences.paymentMix.card))
    setTransfer(String(preferences.paymentMix.transfer))
    initialized.current = true
  }, [preferences])

  const defaultAccountId = preferences?.defaultAccountId ?? null
  const privacyMode = preferences?.privacyMode ?? "local_only"

  const handleSaveMix = useCallback(async () => {
    const cashWeight = parseWeight(cash)
    const cardWeight = parseWeight(card)
    const transferWeight = parseWeight(transfer)

    if (cashWeight === null || cardWeight === null || transferWeight === null) {
      setMixError("Enter valid numbers")
      return
    }

    setMixError(null)
    try {
      await setPreferences.mutateAsync({
        paymentMix: {
          card: cardWeight,
          cash: cashWeight,
          transfer: transferWeight,
        },
      })
    } catch {
      setMixError("Could not save the mix. Please try again.")
    }
  }, [card, cash, setPreferences, transfer])

  if (isLoading) {
    return (
      <Container className="px-5">
        <View className="items-center py-8">
          <Spinner />
        </View>
      </Container>
    )
  }

  return (
    <Container className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">
        Preferences
      </Text>

      <Text className="mt-6 mb-2 text-muted text-sm">Default account</Text>
      <ScrollView
        accessibilityRole="radiogroup"
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <OptionChip
          disabled={setPreferences.isPending}
          label="No default"
          onPress={() => setPreferences.mutate({ defaultAccountId: null })}
          selected={defaultAccountId === null}
        />
        {accounts.map((account) => (
          <OptionChip
            disabled={setPreferences.isPending}
            key={account.id}
            label={account.name}
            onPress={() =>
              setPreferences.mutate({ defaultAccountId: account.id })
            }
            selected={defaultAccountId === account.id}
          />
        ))}
      </ScrollView>
      <Text className="mt-2 text-muted text-xs">
        New transactions without an account use this one.
      </Text>

      <Text className="mt-6 mb-2 text-muted text-sm">Payment mix</Text>
      <Card className="p-4">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField>
              <Label>Cash</Label>
              <Input
                keyboardType="numeric"
                onChangeText={setCash}
                value={cash}
              />
            </TextField>
          </View>
          <View className="flex-1">
            <TextField>
              <Label>Card</Label>
              <Input
                keyboardType="numeric"
                onChangeText={setCard}
                value={card}
              />
            </TextField>
          </View>
          <View className="flex-1">
            <TextField>
              <Label>Transfer</Label>
              <Input
                keyboardType="numeric"
                onChangeText={setTransfer}
                value={transfer}
              />
            </TextField>
          </View>
        </View>
        <Text className="mt-2 text-muted text-xs">
          Relative weights. Without a default account, the most-used kind is
          used.
        </Text>
        {mixError ? (
          <Text className="mt-2 text-destructive text-sm">{mixError}</Text>
        ) : null}
        <Button
          className="mt-3"
          isDisabled={setPreferences.isPending}
          onPress={handleSaveMix}
        >
          <Button.Label>Save mix</Button.Label>
        </Button>
      </Card>

      <Text className="mt-6 mb-2 text-muted text-sm">Privacy</Text>
      <Card className="p-4">
        <Text className="text-foreground">{PRIVACY_LABELS[privacyMode]}</Text>
        <Text className="mt-1 text-muted text-xs">
          Backup & sync is managed from your account.
        </Text>
        <Button
          className="mt-3"
          onPress={() => router.push("/account")}
          variant="outline"
        >
          <Button.Label>Manage in Account</Button.Label>
        </Button>
      </Card>
    </Container>
  )
}
