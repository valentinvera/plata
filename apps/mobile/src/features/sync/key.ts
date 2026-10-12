import { fromBase64, toBase64 } from "./base64"
import type { RandomBytes } from "./crypto"

export const SYNC_KEY_BYTES = 32

export function createSyncKey(randomBytes: RandomBytes): Uint8Array {
  const key = randomBytes(SYNC_KEY_BYTES)

  if (key.length !== SYNC_KEY_BYTES) {
    throw new Error(
      `Expected ${SYNC_KEY_BYTES} random bytes, received ${key.length}`
    )
  }

  return key
}

export function encodeSyncKey(key: Uint8Array): string {
  return toBase64(key)
}

export function decodeSyncKey(value: string): Uint8Array | null {
  const key = fromBase64(value)

  return key.length === SYNC_KEY_BYTES ? key : null
}
