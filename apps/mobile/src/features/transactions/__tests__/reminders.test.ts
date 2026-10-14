import { describe, expect, it } from "bun:test"

import {
  daysSince,
  nextReminderTime,
  planReminder,
  REMINDER_THRESHOLD_DAYS,
} from "../reminders"

const DAY = 24 * 60 * 60 * 1000

// A fixed local reference: 2026-01-10 10:00.
const NOW = new Date(2026, 0, 10, 10, 0, 0).getTime()

describe("daysSince", () => {
  it("is null without history", () => {
    expect(daysSince(null, NOW)).toBeNull()
    expect(daysSince(0, NOW)).toBeNull()
  })

  it("counts whole days", () => {
    expect(daysSince(NOW - 5 * DAY, NOW)).toBe(5)
  })
})

describe("planReminder", () => {
  it("does not plan before the first entry", () => {
    expect(planReminder(null, NOW)).toBeNull()
  })

  it("does not plan while the user is up to date", () => {
    expect(planReminder(NOW - DAY, NOW)).toBeNull()
    expect(
      planReminder(NOW - (REMINDER_THRESHOLD_DAYS - 1) * DAY, NOW)
    ).toBeNull()
  })

  it("plans a gentle reminder once the threshold is reached", () => {
    const plan = planReminder(NOW - REMINDER_THRESHOLD_DAYS * DAY, NOW)

    expect(plan).not.toBeNull()
    expect(plan?.dueAt).toBe(new Date(2026, 0, 10, 20, 0, 0).getTime())
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
