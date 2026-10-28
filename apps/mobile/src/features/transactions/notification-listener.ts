import { Platform } from "react-native"

import NotificationCapture from "@/modules/notification-capture/src/notification-capture-module"

import { ingestNotificationPayload } from "./notification-ingest"
import { createNotificationDrainer } from "./notification-processing"

export type NotificationPermission = "authorized" | "denied" | "unknown"

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS !== "android" || !NotificationCapture) {
    return "unknown"
  }

  const status = await NotificationCapture.getPermissionStatusAsync()

  return status === "authorized" || status === "denied" ? status : "unknown"
}

export function openNotificationSettings(): void {
  if (Platform.OS === "android") {
    NotificationCapture?.requestPermission()
  }
}

const drainNotifications = NotificationCapture
  ? createNotificationDrainer({
      ingest: ingestNotificationPayload,
      queue: NotificationCapture,
    })
  : null

// A shared drain preserves the native read/ack snapshot. Failed batches stay
// queued; successful inserts are recognized by source id on the next attempt.
export async function drainCapturedNotifications(): Promise<number> {
  if (Platform.OS !== "android" || !drainNotifications) {
    return 0
  }
  return await drainNotifications()
}
