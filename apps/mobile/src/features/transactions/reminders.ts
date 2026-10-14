export const REMINDER_THRESHOLD_DAYS = 3
export const REMINDER_HOUR = 20

const DAY_MS = 24 * 60 * 60 * 1000

export interface ReminderPlan {
  body: string
  dueAt: number
  title: string
}

// The first evening the user becomes eligible for a nudge. It is computed in
// advance from the last time something was logged, so the reminder still fires
// even if the app is never reopened before the threshold elapses.
export function planReminder(
  lastLoggedAt: number | null,
  now: number,
  thresholdDays = REMINDER_THRESHOLD_DAYS
): ReminderPlan | null {
  if (lastLoggedAt === null || lastLoggedAt <= 0) {
    // Never nag people who have not logged anything yet.
    return null
  }

  const eligibleAt = lastLoggedAt + thresholdDays * DAY_MS

  return {
    body: "Cuando puedas, sumá lo que gastaste. Sin apuro ni culpa.",
    dueAt: nextReminderTime(Math.max(now, eligibleAt)),
    title: "¿Te ponés al día?",
  }
}

// Next occurrence of the reminder hour (default 20:00) in local time.
export function nextReminderTime(now: number, hour = REMINDER_HOUR): number {
  const date = new Date(now)
  date.setHours(hour, 0, 0, 0)

  if (date.getTime() <= now) {
    date.setDate(date.getDate() + 1)
  }

  return date.getTime()
}
