import { describe, expect, it } from "bun:test"

import { createCipher } from "../crypto"

const KEY = new Uint8Array(32).fill(7)
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function randomBytes(length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, index) => (index + 1) % 256)
}

describe("createCipher", () => {
  it("round-trips plaintext", () => {
    const cipher = createCipher(KEY, randomBytes)
    const plaintext = encoder.encode("un movimiento secreto")

    expect(decoder.decode(cipher.decrypt(cipher.encrypt(plaintext)))).toBe(
      "un movimiento secreto"
    )
  })

  it("prepends a fresh nonce so repeated encryption differs", () => {
    let counter = 0
    const varying = (length: number) => {
      counter += 1

      return new Uint8Array(length).fill(counter)
    }
    const cipher = createCipher(KEY, varying)
    const first = cipher.encrypt(encoder.encode("x"))
    const second = cipher.encrypt(encoder.encode("x"))

    expect(Array.from(first)).not.toEqual(Array.from(second))
    expect(Array.from(first.slice(0, 12))).toEqual(
      Array.from(new Uint8Array(12).fill(1))
    )
  })

  it("rejects a key of the wrong size", () => {
    expect(() => createCipher(new Uint8Array(16), randomBytes)).toThrow()
  })

  it("fails to decrypt with a different key", () => {
    const first = createCipher(KEY, randomBytes)
    const second = createCipher(new Uint8Array(32).fill(9), randomBytes)
    const sealed = first.encrypt(encoder.encode("x"))

    expect(() => second.decrypt(sealed)).toThrow()
  })

  it("fails to decrypt tampered ciphertext", () => {
    const cipher = createCipher(KEY, randomBytes)
    const sealed = cipher.encrypt(encoder.encode("x"))
    const last = sealed.length - 1
    sealed[last] = ((sealed[last] ?? 0) + 1) % 256

    expect(() => cipher.decrypt(sealed)).toThrow()
  })
})
