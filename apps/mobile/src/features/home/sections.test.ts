import { expect, test } from "bun:test"

import type { Transaction, TransactionState } from "../transactions/types"
import { buildHomeSections } from "./sections"

function transaction(
  id: string,
  occurredAt: number,
  state: TransactionState = "confirmed"
): Transaction {
  return {
    id,
    occurredAt,
    state,
    amount: 10_000,
    currency: "ARS",
    kind: "expense",
    accountId: null,
    categoryId: "groceries",
    confidence: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    merchant: id,
    note: null,
    rawRef: null,
    source: "manual",
  }
}

test("pending records stay separate from confirmed days, including the same calendar day", () => {
  const now = new Date(2026, 9, 28, 12).getTime()
  const pending = transaction("pending", now, "suggested")
  const morning = transaction("morning", new Date(2026, 9, 28, 9).getTime())
  const evening = transaction("evening", new Date(2026, 9, 28, 18).getTime())
  const sections = buildHomeSections({
    suggested: [pending],
    confirmed: [evening, morning],
    now,
  })
  expect(sections.map(({ title }) => title)).toEqual(["Para confirmar", "Hoy"])
  expect(sections[0]?.data.map(({ id }) => id)).toEqual(["pending"])
  expect(sections[1]?.data.map(({ id }) => id)).toEqual(["evening", "morning"])
})

test("yesterday follows the local calendar across a month boundary", () => {
  const now = new Date(2026, 10, 1, 0, 15).getTime()
  const sections = buildHomeSections({
    suggested: [],
    confirmed: [transaction("late", new Date(2026, 9, 31, 23, 55).getTime())],
    now,
  })
  expect(sections[0]?.title).toBe("Ayer")
})

test("historical sections expose the year and empty histories have no empty section", () => {
  const now = new Date(2026, 9, 28, 12).getTime()
  const sections = buildHomeSections({
    suggested: [],
    confirmed: [transaction("historical", new Date(2025, 9, 28, 12).getTime())],
    now,
  })
  expect(sections[0]?.title).toContain("2025")
  expect(buildHomeSections({ suggested: [], confirmed: [], now })).toEqual([])
})
