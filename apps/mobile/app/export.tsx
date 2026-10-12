import { Button, Card, Spinner } from "heroui-native"
import { useCallback, useState } from "react"
import { Platform, Text, View } from "react-native"

import { Container } from "@/components/container"
import type { ExportFormat } from "@/src/features/transactions/export"
import { shareTransactions } from "@/src/features/transactions/export-share"

const FORMATS: readonly { format: ExportFormat; label: string }[] = [
  { format: "csv", label: "Share CSV" },
  { format: "json", label: "Share JSON" },
]

export default function ExportScreen() {
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleShare = useCallback(async (format: ExportFormat) => {
    setError(null)
    setDone(false)
    setBusyFormat(format)

    try {
      const shared = await shareTransactions(format)

      if (shared) {
        setDone(true)
      } else {
        setError("Sharing is not available on this device.")
      }
    } catch {
      setError("Could not export your data. Please try again.")
    } finally {
      setBusyFormat(null)
    }
  }, [])

  const busy = busyFormat !== null

  if (Platform.OS === "web") {
    return (
      <Container className="px-5">
        <Text className="pt-3 font-bold text-2xl text-foreground">Export</Text>
        <Text className="mt-2 text-muted text-sm">
          Exporting is available in the mobile app.
        </Text>
      </Container>
    )
  }

  return (
    <Container className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">Export</Text>
      <Text className="mt-1 text-muted text-sm">
        Download your transactions as CSV or JSON and share them wherever you
        want.
      </Text>

      <Card className="mt-4 p-4">
        {FORMATS.map((option) => (
          <View className="mt-2" key={option.format}>
            <Button
              isDisabled={busy}
              onPress={() => handleShare(option.format)}
            >
              <Button.Label>{option.label}</Button.Label>
            </Button>
          </View>
        ))}

        {busyFormat ? (
          <View className="mt-4 items-center">
            <Spinner />
          </View>
        ) : null}

        {error ? (
          <Text className="mt-3 text-destructive text-sm">{error}</Text>
        ) : null}

        {done ? (
          <Text className="mt-3 text-muted text-sm">
            Export ready to share.
          </Text>
        ) : null}
      </Card>
    </Container>
  )
}
