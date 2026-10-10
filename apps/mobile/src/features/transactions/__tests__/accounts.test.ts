import { describe, expect, it } from "bun:test"

import {
  ALL_ACCOUNTS,
  accountFilterClause,
  DEFAULT_ACCOUNTS,
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

describe("accountFilterClause", () => {
  it("adds no condition for the all filter", () => {
    expect(accountFilterClause(ALL_ACCOUNTS)).toEqual({
      clause: "",
      params: [],
    })
  })

  it("matches rows without an account", () => {
    expect(accountFilterClause(NO_ACCOUNT)).toEqual({
      clause: " AND account_id IS NULL",
      params: [],
    })
  })

  it("binds the account id for a specific account", () => {
    expect(accountFilterClause("cash")).toEqual({
      clause: " AND account_id = ?",
      params: ["cash"],
    })
  })
})
