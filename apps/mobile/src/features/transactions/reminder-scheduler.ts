import {
  cancelAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationHandler,
} from "expo-notifications"
import { Platform } from "react-native"

import { getAppMeta, setAppMeta } from "./app-meta-repository"
import { createReminderOperations } from "./reminder-operations"

setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
})

// Inactivity cycle (the last log time) we already armed a nudge for. Keeps the
// reminder to a single nudge per cycle instead of rearming it on every launch.
const REMINDER_CYCLE_KEY = "reminder_cycle"

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

const reminders = createReminderOperations({
  cancelScheduled: cancelAllScheduledNotificationsAsync,
  getCycle: () => getAppMeta(REMINDER_CYCLE_KEY),
  requestPermission: requestReminderPermission,
  async schedule(plan) {
    await scheduleNotificationAsync({
      content: { body: plan.body, title: plan.title },
      trigger: {
        date: new Date(plan.dueAt),
        type: SchedulableTriggerInputTypes.DATE,
      },
    })
  },
  setCycle: (cycle) => setAppMeta(REMINDER_CYCLE_KEY, cycle),
})

export async function cancelReminders(): Promise<void> {
  if (Platform.OS !== "web") {
    await reminders.cancel()
  }
}

// One nudge per inactivity cycle. The shared operations queue orders native
// scheduling and opt-out even when a platform call completes much later.
export async function syncReminder(
  lastLoggedAt: number | null,
  now: number = Date.now()
): Promise<boolean> {
  if (Platform.OS === "web") {
    return false
  }
  return await reminders.sync(lastLoggedAt, now)
}
