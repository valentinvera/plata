import type { Account, AccountKind } from "./accounts"

export type PrivacyMode = "local_only" | "sync"

export type PaymentMix = Record<AccountKind, number>

export interface Preferences {
  defaultAccountId: string | null
  paymentMix: PaymentMix
  privacyMode: PrivacyMode
}

export const ACCOUNT_KIND_ORDER: readonly AccountKind[] = [
  "cash",
  "card",
  "transfer",
]

export const EMPTY_PAYMENT_MIX: PaymentMix = { card: 0, cash: 0, transfer: 0 }

export const DEFAULT_PREFERENCES: Preferences = {
  defaultAccountId: null,
  paymentMix: EMPTY_PAYMENT_MIX,
  privacyMode: "local_only",
}

const PRIVACY_MODES: readonly PrivacyMode[] = ["local_only", "sync"]

function weight(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0
}

function isPrivacyMode(value: unknown): value is PrivacyMode {
  return PRIVACY_MODES.some((mode) => mode === value)
}

function parsePaymentMix(value: unknown): PaymentMix {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {}
  const mix: PaymentMix = { card: 0, cash: 0, transfer: 0 }

  for (const kind of ACCOUNT_KIND_ORDER) {
    mix[kind] = weight(record[kind])
  }

  return mix
}

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) {
    return DEFAULT_PREFERENCES
  }

  try {
    const value: unknown = JSON.parse(raw)

    if (typeof value !== "object" || value === null) {
      return DEFAULT_PREFERENCES
    }

    const record = value as Record<string, unknown>

    return {
      defaultAccountId:
        typeof record.defaultAccountId === "string"
          ? record.defaultAccountId
          : null,
      paymentMix: parsePaymentMix(record.paymentMix),
      privacyMode: isPrivacyMode(record.privacyMode)
        ? record.privacyMode
        : "local_only",
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function serializePreferences(preferences: Preferences): string {
  return JSON.stringify(preferences)
}

// Scales the weights to shares that sum to 1 (all zero when nothing is set).
export function normalizePaymentMix(mix: PaymentMix): PaymentMix {
  const total = ACCOUNT_KIND_ORDER.reduce((sum, kind) => sum + mix[kind], 0)

  if (total <= 0) {
    return { ...EMPTY_PAYMENT_MIX }
  }

  return {
    card: mix.card / total,
    cash: mix.cash / total,
    transfer: mix.transfer / total,
  }
}

export function preferredAccountKind(mix: PaymentMix): AccountKind | null {
  let best: AccountKind | null = null

  for (const kind of ACCOUNT_KIND_ORDER) {
    if (mix[kind] > 0 && (best === null || mix[kind] > mix[best])) {
      best = kind
    }
  }

  return best
}

// The account to use for a new transaction without one: the explicit default
// when set, otherwise the account of the most-used payment kind.
export function resolveDefaultAccountId(
  preferences: Preferences,
  accounts: readonly Account[]
): string | null {
  const explicit = accounts.find(
    (account) => account.id === preferences.defaultAccountId
  )

  if (explicit) {
    return explicit.id
  }

  const kind = preferredAccountKind(preferences.paymentMix)

  return accounts.find((account) => account.kind === kind)?.id ?? null
}
