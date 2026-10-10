import { describe, expect, it } from "bun:test"

import { DEFAULT_ACCOUNTS, getAccountName } from "../accounts"

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
