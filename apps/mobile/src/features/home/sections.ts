import { formatDay } from "../transactions/format"
import type { Transaction } from "../transactions/types"

export interface TransactionSection {
  data: Transaction[]
  key: string
  title: string
  type: "suggested" | "confirmed"
}

const yearDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function dayStart(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function dateTitle(
  day: number,
  now: number,
  today: number,
  yesterday: number
): string {
  if (day === today) {
    return "Hoy"
  }
  if (day === yesterday) {
    return "Ayer"
  }
  if (new Date(day).getFullYear() !== new Date(now).getFullYear()) {
    return yearDateFormatter.format(day)
  }
  return formatDay(day)
}

export function buildHomeSections({
  suggested,
  confirmed,
  now,
}: {
  suggested: readonly Transaction[]
  confirmed: readonly Transaction[]
  now: number
}): TransactionSection[] {
  const sections: TransactionSection[] = []
  if (suggested.length > 0) {
    sections.push({
      key: "suggested",
      title: "Para confirmar",
      type: "suggested",
      data: [...suggested],
    })
  }
  const today = dayStart(now)
  const previousDay = new Date(today)
  previousDay.setDate(previousDay.getDate() - 1)
  const yesterday = previousDay.getTime()
  const days = new Map<number, TransactionSection>()
  // The repository supplies newest-first records; preserve that order and never
  // modify its arrays when grouping the presentation by local calendar day.
  for (const transaction of confirmed) {
    const day = dayStart(transaction.occurredAt)
    let section = days.get(day)
    if (!section) {
      section = {
        key: `confirmed:${day}`,
        title: dateTitle(day, now, today, yesterday),
        type: "confirmed",
        data: [],
      }
      days.set(day, section)
      sections.push(section)
    }
    section.data.push(transaction)
  }
  return sections
}
