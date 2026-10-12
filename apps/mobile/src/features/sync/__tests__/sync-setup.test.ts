import { describe, expect, it } from "bun:test"

import { resolveSyncSetupState } from "../sync-setup-state"

describe("resolveSyncSetupState", () => {
  it("is ready when the device already has a key", () => {
    expect(
      resolveSyncSetupState({
        hasKey: true,
        hasRemoteData: true,
        hasWrappedKey: true,
      })
    ).toBe("ready")
  })

  it("needs recovery when the account has a wrapped key", () => {
    expect(
      resolveSyncSetupState({
        hasKey: false,
        hasRemoteData: true,
        hasWrappedKey: true,
      })
    ).toBe("needs-recovery")
  })

  it("needs reset when there is remote data but no backup", () => {
    expect(
      resolveSyncSetupState({
        hasKey: false,
        hasRemoteData: true,
        hasWrappedKey: false,
      })
    ).toBe("needs-reset")
  })

  it("is fresh for an empty account", () => {
    expect(
      resolveSyncSetupState({
        hasKey: false,
        hasRemoteData: false,
        hasWrappedKey: false,
      })
    ).toBe("fresh")
  })
})
