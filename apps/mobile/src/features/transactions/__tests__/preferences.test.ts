import { describe, expect, it } from "bun:test"

import type { Account } from "../accounts"
import {
  DEFAULT_PREFERENCES,
  EMPTY_PAYMENT_MIX,
  normalizePaymentMix,
  type Preferences,
  parsePreferences,
  preferredAccountKind,
  resolveDefaultAccountId,
  resolveInputAccountId,
  serializePreferences,
} from "../preferences"

const ACCOUNTS: readonly Account[] = [
  { createdAt: 0, id: "cash", kind: "cash", name: "Efectivo" },
  { createdAt: 0, id: "card", kind: "card", name: "Tarjeta" },
  { createdAt: 0, id: "transfer", kind: "transfer", name: "Transferencia" },
]

describe("parsePreferences", () => {
  it("returns defaults for missing or invalid input", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences("not json")).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences("42")).toEqual(DEFAULT_PREFERENCES)
  })

  it("round-trips a stored value", () => {
    const preferences: Preferences = {
      defaultAccountId: "card",
      paymentMix: { card: 3, cash: 1, transfer: 0 },
      privacyMode: "sync",
      remindersEnabled: true,
    }

    expect(parsePreferences(serializePreferences(preferences))).toEqual(
      preferences
    )
  })

  it("clamps invalid weights and privacy mode", () => {
    const parsed = parsePreferences(
      JSON.stringify({
        paymentMix: { card: -5, cash: "x", transfer: Number.NaN },
        privacyMode: "weird",
      })
    )

    expect(parsed.paymentMix).toEqual({ card: 0, cash: 0, transfer: 0 })
    expect(parsed.privacyMode).toBe("local_only")
  })
})

describe("normalizePaymentMix", () => {
  it("scales weights to shares", () => {
    expect(normalizePaymentMix({ card: 3, cash: 1, transfer: 0 })).toEqual({
      card: 0.75,
      cash: 0.25,
      transfer: 0,
    })
  })

  it("returns zeros when empty", () => {
    expect(normalizePaymentMix(EMPTY_PAYMENT_MIX)).toEqual(EMPTY_PAYMENT_MIX)
  })
})

describe("preferredAccountKind", () => {
  it("picks the highest weight", () => {
    expect(preferredAccountKind({ card: 1, cash: 2, transfer: 0 })).toBe("cash")
  })

  it("breaks ties by the canonical order", () => {
    expect(preferredAccountKind({ card: 1, cash: 1, transfer: 0 })).toBe("cash")
  })

  it("returns null when empty", () => {
    expect(preferredAccountKind(EMPTY_PAYMENT_MIX)).toBeNull()
  })
})

describe("resolveDefaultAccountId", () => {
  it("uses the explicit default account", () => {
    expect(
      resolveDefaultAccountId(
        { ...DEFAULT_PREFERENCES, defaultAccountId: "card" },
        ACCOUNTS
      )
    ).toBe("card")
  })

  it("falls back to the most-used payment kind", () => {
    expect(
      resolveDefaultAccountId(
        {
          ...DEFAULT_PREFERENCES,
          paymentMix: { card: 0, cash: 0, transfer: 5 },
        },
        ACCOUNTS
      )
    ).toBe("transfer")
  })

  it("ignores an explicit default that no longer exists", () => {
    expect(
      resolveDefaultAccountId(
        {
          ...DEFAULT_PREFERENCES,
          defaultAccountId: "gone",
          paymentMix: { card: 2, cash: 0, transfer: 0 },
        },
        ACCOUNTS
      )
    ).toBe("card")
  })

  it("returns null without a usable account", () => {
    expect(resolveDefaultAccountId(DEFAULT_PREFERENCES, ACCOUNTS)).toBeNull()
    expect(
      resolveDefaultAccountId(
        {
          ...DEFAULT_PREFERENCES,
          paymentMix: { card: 1, cash: 0, transfer: 0 },
        },
        []
      )
    ).toBeNull()
  })
})

describe("resolveInputAccountId", () => {
  const cardDefault = { ...DEFAULT_PREFERENCES, defaultAccountId: "card" }

  it("uses the saved default instead of the first account", () => {
    expect(resolveInputAccountId(null, cardDefault, ACCOUNTS)).toBe("card")
  })

  it("uses the most-used payment kind without an explicit default", () => {
    expect(
      resolveInputAccountId(
        null,
        {
          ...DEFAULT_PREFERENCES,
          paymentMix: { cash: 0, card: 1, transfer: 5 },
        },
        ACCOUNTS
      )
    ).toBe("transfer")
  })

  it("prefers a manual choice over the saved default", () => {
    expect(resolveInputAccountId("cash", cardDefault, ACCOUNTS)).toBe("cash")
  })

  it("allows a valid manual choice while preferences are unavailable", () => {
    expect(resolveInputAccountId("card", undefined, ACCOUNTS)).toBe("card")
  })

  it("does not choose a fallback account before preferences finish loading", () => {
    expect(resolveInputAccountId(null, undefined, ACCOUNTS)).toBeNull()
  })

  it("falls back to the first account only after empty preferences are loaded", () => {
    expect(resolveInputAccountId(null, DEFAULT_PREFERENCES, ACCOUNTS)).toBe(
      "cash"
    )
  })

  it("ignores a deleted manual choice and resolves the saved default", () => {
    expect(resolveInputAccountId("deleted", cardDefault, ACCOUNTS)).toBe("card")
    expect(resolveInputAccountId("deleted", undefined, ACCOUNTS)).toBeNull()
  })

  it("ignores a stale stored default and uses the payment mix", () => {
    expect(
      resolveInputAccountId(
        null,
        {
          ...DEFAULT_PREFERENCES,
          defaultAccountId: "deleted",
          paymentMix: { cash: 0, card: 0, transfer: 1 },
        },
        ACCOUNTS
      )
    ).toBe("transfer")
  })

  it("keeps an explicit choice after preferences refresh", () => {
    expect(resolveInputAccountId("cash", cardDefault, ACCOUNTS)).toBe("cash")
    expect(
      resolveInputAccountId(
        "cash",
        { ...cardDefault, defaultAccountId: "transfer" },
        ACCOUNTS
      )
    ).toBe("cash")
  })

  it("waits for an available account even when a manual id is present", () => {
    expect(resolveInputAccountId("card", cardDefault, [])).toBeNull()
    expect(resolveInputAccountId(null, DEFAULT_PREFERENCES, [])).toBeNull()
  })
})
