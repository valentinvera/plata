import {
  CryptoDigestAlgorithm,
  digestStringAsync,
  getRandomBytes,
} from "expo-crypto"
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store"

import { createCipher, type RandomBytes } from "./crypto"
import { createSyncKey, decodeSyncKey, encodeSyncKey } from "./key"
import type { SyncCipher } from "./types"

const KEY_NAME = "plata.sync.key"

export const randomBytes: RandomBytes = (length) => getRandomBytes(length)

let pendingKey: Promise<Uint8Array> | null = null

export async function readSyncKey(): Promise<Uint8Array | null> {
  const stored = await getItemAsync(KEY_NAME)

  return stored ? decodeSyncKey(stored) : null
}

async function generateAndStoreKey(): Promise<Uint8Array> {
  const existing = await readSyncKey()

  if (existing) {
    return existing
  }

  const key = createSyncKey(randomBytes)
  await setItemAsync(KEY_NAME, encodeSyncKey(key))

  return key
}

// Serialized so concurrent first-use callers (e.g. foreground and manual sync)
// share a single generated key instead of racing to overwrite each other.
export function initializeSyncKey(): Promise<Uint8Array> {
  if (!pendingKey) {
    pendingKey = generateAndStoreKey().finally(() => {
      pendingKey = null
    })
  }

  return pendingKey
}

export async function clearSyncKey(): Promise<void> {
  await deleteItemAsync(KEY_NAME)
}

export function storeSyncKey(key: Uint8Array): Promise<void> {
  return setItemAsync(KEY_NAME, encodeSyncKey(key))
}

// Stable, non-secret fingerprint used to compare this device's key with the
// account's reserved key identity.
export function keyFingerprint(key: Uint8Array): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, encodeSyncKey(key))
}

// Fails closed when no key exists: a fresh install must recover or explicitly
// reset the account's ciphertext before a replacement key is generated, so we
// never silently orphan data encrypted with the previous key.
export async function createSyncCipher(): Promise<SyncCipher> {
  const key = await readSyncKey()

  if (!key) {
    throw new Error(
      "No sync key on this device; recover or reset the sync data first"
    )
  }

  return createCipher(key, randomBytes)
}
