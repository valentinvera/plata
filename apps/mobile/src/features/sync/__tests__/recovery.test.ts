import { describe, expect, it } from "bun:test"

import { createSyncKey } from "../key"
import {
  decodeRecoverySecret,
  generateRecoverySecret,
  RECOVERY_SECRET_BYTES,
  unwrapSyncKey,
  wrapSyncKey,
} from "../recovery"

function randomBytes(length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, index) => (index * 13) % 256)
}

const SECRET = decodeRecoverySecret(generateRecoverySecret(randomBytes))
const SYNC_KEY = createSyncKey(randomBytes)

describe("recovery secret", () => {
  it("generates and decodes a secret of the expected length", () => {
    expect(
      decodeRecoverySecret(generateRecoverySecret(randomBytes))?.length
    ).toBe(RECOVERY_SECRET_BYTES)
  })

  it("returns null for a value of the wrong length", () => {
    expect(decodeRecoverySecret("AAAA")).toBeNull()
  })
})

describe("wrapSyncKey / unwrapSyncKey", () => {
  it("round-trips the sync key", () => {
    if (!SECRET) {
      throw new Error("test secret is invalid")
    }

    const wrapped = wrapSyncKey(SYNC_KEY, SECRET, randomBytes)

    expect(Array.from(unwrapSyncKey(wrapped, SECRET) ?? [])).toEqual(
      Array.from(SYNC_KEY)
    )
  })

  it("returns null when the secret does not match", () => {
    if (!SECRET) {
      throw new Error("test secret is invalid")
    }

    const other = Uint8Array.from(SECRET, (byte) => (byte + 1) % 256)
    const wrapped = wrapSyncKey(SYNC_KEY, SECRET, randomBytes)

    expect(unwrapSyncKey(wrapped, other)).toBeNull()
  })

  it("returns null for tampered ciphertext", () => {
    if (!SECRET) {
      throw new Error("test secret is invalid")
    }

    const wrapped = wrapSyncKey(SYNC_KEY, SECRET, randomBytes)
    const index = Math.floor(wrapped.length / 2)
    const swapped = wrapped[index] === "A" ? "B" : "A"
    const tampered =
      wrapped.slice(0, index) + swapped + wrapped.slice(index + 1)

    expect(unwrapSyncKey(tampered, SECRET)).toBeNull()
  })
})
