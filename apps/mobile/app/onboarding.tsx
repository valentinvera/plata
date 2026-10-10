import { router } from "expo-router"
import { Button, Card } from "heroui-native"
import { useCallback, useEffect, useState } from "react"
import { Platform, Text, View } from "react-native"

import { Container } from "@/components/container"
import { useSetAppMeta } from "@/src/features/transactions/hooks"
import {
  getNotificationPermission,
  type NotificationPermission,
  openNotificationSettings,
} from "@/src/features/transactions/notification-listener"
import {
  ONBOARDING_BENEFITS,
  ONBOARDING_COMPLETED_KEY,
} from "@/src/features/transactions/onboarding"

export default function OnboardingScreen() {
  const setAppMeta = useSetAppMeta()
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  )

  const refreshPermission = useCallback(async () => {
    setPermission(await getNotificationPermission())
  }, [])

  useEffect(() => {
    refreshPermission().catch(() => setPermission("unknown"))
  }, [refreshPermission])

  const finish = useCallback(async () => {
    await setAppMeta.mutateAsync({
      key: ONBOARDING_COMPLETED_KEY,
      value: "1",
    })
    router.replace("/")
  }, [setAppMeta])

  const notificationsEnabled = permission === "authorized"

  return (
    <Container className="px-5">
      <Text className="pt-6 pb-2 font-bold text-3xl text-foreground">
        Tu plata ordenada sola
      </Text>
      <Text className="pb-2 text-muted text-sm">
        Volvés al día en segundos aunque hayas desaparecido semanas.
      </Text>

      {ONBOARDING_BENEFITS.map((benefit) => (
        <Card className="mt-3 p-4" key={benefit.title}>
          <Text className="font-semibold text-foreground">{benefit.title}</Text>
          <Text className="mt-1 text-muted text-sm">{benefit.description}</Text>
        </Card>
      ))}

      {Platform.OS === "android" ? (
        <Card className="mt-3 p-4">
          <Text className="font-semibold text-foreground">
            Automatic import
          </Text>
          <Text className="mt-1 text-muted text-sm">
            {notificationsEnabled
              ? "Notification access is on."
              : "Grant access so Plata can read payment notifications."}
          </Text>
          <Button className="mt-3" onPress={openNotificationSettings}>
            <Button.Label>
              {notificationsEnabled ? "Open settings" : "Enable"}
            </Button.Label>
          </Button>
        </Card>
      ) : null}

      <View className="mt-6 gap-3 pb-6">
        <Button isDisabled={setAppMeta.isPending} onPress={finish}>
          <Button.Label>Start</Button.Label>
        </Button>
      </View>
    </Container>
  )
}
