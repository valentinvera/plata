import { Button, Card } from "heroui-native"
import { useCallback, useEffect, useState } from "react"
import { Text } from "react-native"

import { Container } from "@/components/container"
import {
  getNotificationPermission,
  type NotificationPermission,
  openNotificationSettings,
} from "@/src/features/transactions/notification-listener"

function statusMessage(status: NotificationPermission | null): string {
  if (status === null) {
    return "Checking…"
  }

  if (status === "authorized") {
    return "Enabled. New bank notifications will show up as suggestions."
  }

  return "Disabled. Grant access so Plata can read payment notifications."
}

export default function NotificationsScreen() {
  const [status, setStatus] = useState<NotificationPermission | null>(null)

  const refresh = useCallback(async () => {
    setStatus(await getNotificationPermission())
  }, [])

  useEffect(() => {
    refresh().catch(() => setStatus("unknown"))
  }, [refresh])

  const authorized = status === "authorized"

  return (
    <Container className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">
        Automatic import
      </Text>
      <Text className="mt-1 text-muted text-sm">
        Plata can turn bank notifications into suggested transactions.
      </Text>

      <Card className="mt-4 p-4">
        <Text className="font-semibold text-foreground">
          Notification access
        </Text>
        <Text className="mt-2 text-muted text-sm">{statusMessage(status)}</Text>
        <Button className="mt-3" onPress={openNotificationSettings}>
          <Button.Label>{authorized ? "Open settings" : "Enable"}</Button.Label>
        </Button>
        <Button className="mt-2" onPress={refresh} variant="outline">
          <Button.Label>Refresh status</Button.Label>
        </Button>
      </Card>
    </Container>
  )
}
