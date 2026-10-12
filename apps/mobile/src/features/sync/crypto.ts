import { gcm } from "@noble/ciphers/aes.js"

import type { SyncCipher } from "./types"

const KEY_BYTES = 32
const NONCE_BYTES = 12

export type RandomBytes = (length: number) => Uint8Array

// AES-256-GCM with a random nonce prepended to the ciphertext. The key is
// supplied by the caller (see the sync key management follow-up).
export function createCipher(
  key: Uint8Array,
  randomBytes: RandomBytes
): SyncCipher {
  if (key.length !== KEY_BYTES) {
    throw new Error(`The sync key must be ${KEY_BYTES} bytes`)
  }

  return {
    decrypt(ciphertext) {
      const nonce = ciphertext.slice(0, NONCE_BYTES)

      return gcm(key, nonce).decrypt(ciphertext.slice(NONCE_BYTES))
    },
    encrypt(plaintext) {
      const nonce = randomBytes(NONCE_BYTES)
      const sealed = gcm(key, nonce).encrypt(plaintext)
      const output = new Uint8Array(nonce.length + sealed.length)

      output.set(nonce, 0)
      output.set(sealed, nonce.length)

      return output
    },
  }
}
