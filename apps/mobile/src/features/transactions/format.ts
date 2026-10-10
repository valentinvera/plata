import type { Currency } from "./types"

const formatters = new Map<Currency, Intl.NumberFormat>()

function amountFormatter(currency: Currency): Intl.NumberFormat {
  const cached = formatters.get(currency)
  if (cached) {
    return cached
  }

  const formatter = new Intl.NumberFormat("es-AR", {
    currency,
    style: "currency",
  })
  formatters.set(currency, formatter)
  return formatter
}

export function formatAmount(cents: number, currency: Currency): string {
  return amountFormatter(currency).format(cents / 100)
}
