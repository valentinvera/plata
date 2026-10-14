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

// Inactivity cycle (the last log time) we already armed a nudge for. Keeps the
// reminder to a single nudge per cycle instead of rearming it on every launch.
const REMINDER_CYCLE_KEY = "reminder_cycle"

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

  await setAppMeta(REMINDER_CYCLE_KEY, "")
  await cancelAllScheduledNotificationsAsync()
}

// Schedules the single "get up to date" reminder for the first evening the user
// is eligible, based on when they last logged something. A cycle is reminded at
// most once; logging again starts a new cycle. Returns whether a reminder is now
// scheduled.
export async function syncReminder(
  lastLoggedAt: number | null,
  now: number = Date.now()
): Promise<boolean> {
  if (Platform.OS === "web") {
    return false
  }

  generation += 1
  const mine = generation

  const cycle = lastLoggedAt === null ? null : String(lastLoggedAt)

  if (cycle !== null && (await getAppMeta(REMINDER_CYCLE_KEY)) === cycle) {
    return false
  }

  await cancelAllScheduledNotificationsAsync()

  const plan = planReminder(lastLoggedAt, now)

  if (!plan) {
    await setAppMeta(REMINDER_CYCLE_KEY, "")
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
  await setAppMeta(REMINDER_CYCLE_KEY, cycle ?? "")

  return true
}
