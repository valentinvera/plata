import { describe, expect, it } from "bun:test"

import {
  ALL_ACCOUNTS,
  DEFAULT_ACCOUNTS,
  filterTransactionsByAccount,
  getAccountName,
  NO_ACCOUNT,
  validateAccountName,
} from "../accounts"

const accounts = DEFAULT_ACCOUNTS.map((account) => ({
  ...account,
  createdAt: 0,
}))

describe("getAccountName", () => {
  it("returns the account name for a known id", () => {
    expect(getAccountName(accounts, "cash")).toBe("Efectivo")
  })

  it("returns null for a null or unknown id", () => {
    expect(getAccountName(accounts, null)).toBeNull()
    expect(getAccountName(accounts, "unknown")).toBeNull()
  })
})

describe("validateAccountName", () => {
  it("rejects empty names", () => {
    expect(validateAccountName("", accounts)).toBe("Enter a name")
    expect(validateAccountName("   ", accounts)).toBe("Enter a name")
  })

  it("rejects duplicate names ignoring case and surrounding space", () => {
    const message = "An account with that name already exists"
    expect(validateAccountName("Efectivo", accounts)).toBe(message)
    expect(validateAccountName("  efectivo ", accounts)).toBe(message)
  })

  it("accepts a new name and ignores the account being renamed", () => {
    expect(validateAccountName("Banco", accounts)).toBeNull()
    expect(validateAccountName("Efectivo", accounts, "cash")).toBeNull()
  })
})

describe("filterTransactionsByAccount", () => {
  const transactions = [
    { accountId: "cash", id: "1" },
    { accountId: null, id: "2" },
    { accountId: "card", id: "3" },
  ]

  const ids = (filter: string) =>
    filterTransactionsByAccount(transactions, filter).map((item) => item.id)

  it("returns every transaction for the all filter", () => {
    expect(ids(ALL_ACCOUNTS)).toEqual(["1", "2", "3"])
  })

  it("keeps only the selected account", () => {
    expect(ids("cash")).toEqual(["1"])
    expect(ids("card")).toEqual(["3"])
  })

  it("keeps only transactions without an account", () => {
    expect(ids(NO_ACCOUNT)).toEqual(["2"])
  })

  it("returns nothing for an unknown account", () => {
    expect(ids("unknown")).toEqual([])
  })
})
