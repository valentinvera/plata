import { getRandomBytes } from "expo-crypto"
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store"

import { createCipher, type RandomBytes } from "./crypto"
import { createSyncKey, decodeSyncKey, encodeSyncKey } from "./key"
import type { SyncCipher } from "./types"

const KEY_NAME = "plata.sync.key"

export const randomBytes: RandomBytes = (length) => getRandomBytes(length)

// The sync key never leaves the device: it is generated once and kept in the
// secure store, then used to encrypt every blob.
export async function getOrCreateSyncKey(): Promise<Uint8Array> {
  const stored = await getItemAsync(KEY_NAME)

  if (stored) {
    const key = decodeSyncKey(stored)

    if (key) {
      return key
    }
  }

  const key = createSyncKey(randomBytes)
  await setItemAsync(KEY_NAME, encodeSyncKey(key))

  return key
}

export async function deleteSyncKey(): Promise<void> {
  await deleteItemAsync(KEY_NAME)
}

export async function createSyncCipher(): Promise<SyncCipher> {
  return createCipher(await getOrCreateSyncKey(), randomBytes)
}
