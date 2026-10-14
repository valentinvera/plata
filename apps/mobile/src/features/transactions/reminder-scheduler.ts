import {
  cancelAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationHandler,
} from "expo-notifications"
import { Platform } from "react-native"

import { planReminder } from "./reminders"

setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
})

export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false
  }

  const current = await getPermissionsAsync()

  if (current.granted) {
    return true
  }

  const requested = await requestPermissionsAsync()

  return requested.granted
}

export async function cancelReminders(): Promise<void> {
  if (Platform.OS === "web") {
    return
  }

  await cancelAllScheduledNotificationsAsync()
}

// Schedules (or clears) the single "get up to date" reminder for the next
// occurrence of the reminder hour, based on how long ago the last transaction
// was. Returns whether a reminder is now scheduled.
export async function syncReminder(
  lastAt: number | null,
  now: number = Date.now()
): Promise<boolean> {
  if (Platform.OS === "web") {
    return false
  }

  await cancelReminders()

  const plan = planReminder(lastAt, now)

  if (!plan) {
    return false
  }

  if (!(await requestReminderPermission())) {
    return false
  }

  await scheduleNotificationAsync({
    content: { body: plan.body, title: plan.title },
    trigger: {
      date: new Date(plan.dueAt),
      type: SchedulableTriggerInputTypes.DATE,
    },
  })

  return true
}
