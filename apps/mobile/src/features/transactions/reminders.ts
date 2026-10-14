export const REMINDER_THRESHOLD_DAYS = 3
export const REMINDER_HOUR = 20

const DAY_MS = 24 * 60 * 60 * 1000

export interface ReminderPlan {
  body: string
  dueAt: number
  title: string
}

export function daysSince(lastAt: number | null, now: number): number | null {
  if (lastAt === null || lastAt <= 0) {
    return null
  }

  return Math.floor((now - lastAt) / DAY_MS)
}

// Gentle, opt-in nudge: only after the user has been away for a few days, and
// never before their first entry (we don't nag people who have not started).
export function planReminder(
  lastAt: number | null,
  now: number,
  thresholdDays = REMINDER_THRESHOLD_DAYS
): ReminderPlan | null {
  const days = daysSince(lastAt, now)

  if (days === null || days < thresholdDays) {
    return null
  }

  return {
    body: "Cuando puedas, sumá lo que gastaste. Sin apuro ni culpa.",
    dueAt: nextReminderTime(now),
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
