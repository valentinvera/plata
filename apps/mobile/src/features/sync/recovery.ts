import { fromBase64, toBase64 } from "./base64"
import { open, type RandomBytes, seal } from "./crypto"
import { SYNC_KEY_BYTES } from "./key"

// A high-entropy recovery secret (a "recovery code") is used directly as the
// AES key that wraps the sync key, so no password KDF is involved.
export const RECOVERY_SECRET_BYTES = 32

export function generateRecoverySecret(randomBytes: RandomBytes): string {
  return toBase64(randomBytes(RECOVERY_SECRET_BYTES))
}

export function decodeRecoverySecret(value: string): Uint8Array | null {
  const secret = fromBase64(value)

  return secret.length === RECOVERY_SECRET_BYTES ? secret : null
}

export function wrapSyncKey(
  syncKey: Uint8Array,
  secret: Uint8Array,
  randomBytes: RandomBytes
): string {
  return toBase64(seal(syncKey, secret, randomBytes))
}

export function unwrapSyncKey(
  wrapped: string,
  secret: Uint8Array
): Uint8Array | null {
  try {
    const syncKey = open(fromBase64(wrapped), secret)

    return syncKey.length === SYNC_KEY_BYTES ? syncKey : null
  } catch {
    return null
  }
}
