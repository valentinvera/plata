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

// Bumped on every sync/opt-out. A sync that gets superseded while awaiting a
// permission or native call must not schedule after the fact, otherwise a stale
// sync could resurrect a reminder the user just turned off.
let generation = 0

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
  generation += 1

  if (Platform.OS === "web") {
    return
  }

  await cancelAllScheduledNotificationsAsync()
}

// Schedules (or clears) the single "get up to date" reminder for the first
// evening the user is eligible, based on when they last logged something.
// Returns whether a reminder is now scheduled.
export async function syncReminder(
  lastLoggedAt: number | null,
  now: number = Date.now()
): Promise<boolean> {
  if (Platform.OS === "web") {
    return false
  }

  generation += 1
  const mine = generation

  await cancelAllScheduledNotificationsAsync()

  const plan = planReminder(lastLoggedAt, now)

  if (!plan) {
    return false
  }

  if (!(await requestReminderPermission())) {
    return false
  }

  if (mine !== generation) {
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
