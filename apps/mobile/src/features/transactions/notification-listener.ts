import { AppRegistry } from "react-native"
import RNAndroidNotificationListener, {
  RNAndroidNotificationListenerHeadlessJsName,
} from "react-native-android-notification-listener"

import { ingestNotification } from "./notification-ingest"

export type NotificationPermission = "authorized" | "denied" | "unknown"

interface HeadlessNotificationData {
  notification?: string
}

async function handleHeadlessNotification({
  notification,
}: HeadlessNotificationData): Promise<void> {
  if (notification) {
    await ingestNotification(notification)
  }
}

let isRegistered = false

export function registerNotificationListener(): void {
  if (isRegistered) {
    return
  }

  isRegistered = true
  AppRegistry.registerHeadlessTask(
    RNAndroidNotificationListenerHeadlessJsName,
    () => handleHeadlessNotification
  )
}

export function getNotificationPermission(): Promise<NotificationPermission> {
  return RNAndroidNotificationListener.getPermissionStatus()
}

export function openNotificationSettings(): void {
  RNAndroidNotificationListener.requestPermission()
}
