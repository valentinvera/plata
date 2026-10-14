import { Platform } from "react-native"

import NotificationCapture, {
  type CapturedNotification,
} from "@/modules/notification-capture/src/notification-capture-module"

import type { NotificationPayload } from "./notification"
import { ingestNotificationPayload } from "./notification-ingest"

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

function toPayload(item: CapturedNotification): NotificationPayload {
  return {
    app: item.app,
    bigText: item.bigText,
    text: item.text,
    time: item.time,
    title: item.title,
  }
}

// Turns the notifications captured while the app was away into suggestions.
// Returns how many were ingested. The native queue is only acknowledged after
// processing, so a crash mid-drain re-processes (idempotently) next time.
export async function drainCapturedNotifications(): Promise<number> {
  if (Platform.OS !== "android" || !NotificationCapture) {
    return 0
  }

  const raw = await NotificationCapture.readPendingsAsync()
  let items: unknown

  try {
    items = JSON.parse(raw)
  } catch {
    return 0
  }

  if (!Array.isArray(items)) {
    return 0
  }

  let ingested = 0

  for (const item of items) {
    const payload = toPayload(item as CapturedNotification)
    // biome-ignore lint/performance/noAwaitInLoops: SQLite writes stay sequential
    const accepted = await ingestNotificationPayload(payload)

    if (accepted) {
      ingested += 1
    }
  }

  await NotificationCapture.ackAsync()

  return ingested
}
