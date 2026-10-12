import { gcm } from "@noble/ciphers/aes.js"

import type { SyncCipher } from "./types"

const KEY_BYTES = 32
const NONCE_BYTES = 12

export type RandomBytes = (length: number) => Uint8Array

// AES-256-GCM with a random nonce prepended to the ciphertext.
export function seal(
  plaintext: Uint8Array,
  key: Uint8Array,
  randomBytes: RandomBytes
): Uint8Array {
  const nonce = randomBytes(NONCE_BYTES)
  const body = gcm(key, nonce).encrypt(plaintext)
  const output = new Uint8Array(nonce.length + body.length)

  output.set(nonce, 0)
  output.set(body, nonce.length)

  return output
}

export function open(ciphertext: Uint8Array, key: Uint8Array): Uint8Array {
  const nonce = ciphertext.slice(0, NONCE_BYTES)

  return gcm(key, nonce).decrypt(ciphertext.slice(NONCE_BYTES))
}

// The sync key is supplied by the caller (see key-store).
export function createCipher(
  key: Uint8Array,
  randomBytes: RandomBytes
): SyncCipher {
  if (key.length !== KEY_BYTES) {
    throw new Error(`The sync key must be ${KEY_BYTES} bytes`)
  }

  return {
    decrypt: (ciphertext) => open(ciphertext, key),
    encrypt: (plaintext) => seal(plaintext, key, randomBytes),
  }
}
