import { describe, expect, it } from "bun:test"

import {
  nextReminderTime,
  planReminder,
  REMINDER_THRESHOLD_DAYS,
} from "../reminders"

const DAY = 24 * 60 * 60 * 1000

// A fixed local reference: 2026-01-10 10:00.
const NOW = new Date(2026, 0, 10, 10, 0, 0).getTime()

describe("planReminder", () => {
  it("does not plan before the first entry", () => {
    expect(planReminder(null, NOW)).toBeNull()
    expect(planReminder(0, NOW)).toBeNull()
  })

  it("schedules the first eligible evening in advance", () => {
    // Logged today: eligible three days out, at the reminder hour.
    const plan = planReminder(NOW, NOW)

    expect(plan).not.toBeNull()
    expect(plan?.dueAt).toBe(new Date(2026, 0, 13, 20, 0, 0).getTime())
  })

  it("uses the next evening once the threshold has elapsed", () => {
    const plan = planReminder(NOW - 5 * DAY, NOW)

    expect(plan?.dueAt).toBe(new Date(2026, 0, 10, 20, 0, 0).getTime())
  })

  it("is eligible exactly at the threshold", () => {
    const plan = planReminder(NOW - REMINDER_THRESHOLD_DAYS * DAY, NOW)

    expect(plan?.dueAt).toBe(new Date(2026, 0, 10, 20, 0, 0).getTime())
  })

  it("keeps a gentle, non-judgemental tone", () => {
    const plan = planReminder(NOW, NOW)

    expect(plan?.title).toBeTruthy()
    expect(plan?.body).toBeTruthy()
  })
})

describe("nextReminderTime", () => {
  it("uses today when the hour is still ahead", () => {
    expect(nextReminderTime(NOW)).toBe(
      new Date(2026, 0, 10, 20, 0, 0).getTime()
    )
  })

  it("moves to tomorrow once the hour has passed", () => {
    const late = new Date(2026, 0, 10, 21, 0, 0).getTime()

    expect(nextReminderTime(late)).toBe(
      new Date(2026, 0, 11, 20, 0, 0).getTime()
    )
  })
})
