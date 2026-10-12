import { Platform } from "react-native"

import { getAppMeta, setAppMeta } from "../transactions/app-meta-repository"
import { createId } from "../transactions/id"
import {
  clearSyncKey,
  initializeSyncKey,
  randomBytes,
  readSyncKey,
} from "./key-store"
import { runSyncWithDeps } from "./sync-runner"
import { clearSyncCursor, createTransactionSyncStore } from "./sync-store"
import { createSyncTransport, type SyncApiClient } from "./sync-transport"
import type { SyncSummary } from "./types"

const DEVICE_ID_KEY = "sync_device_id"
const SYNC_USER_KEY = "sync_user_id"

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getAppMeta(DEVICE_ID_KEY)

  if (existing && existing.length > 0) {
    return existing
  }

  const id = createId()
  await setAppMeta(DEVICE_ID_KEY, id)

  return id
}

// The local database is not partitioned per account, so refuse to sync when a
// different user takes over the device: the auth flow must wipe local data and
// reset the sync state before syncing as the new user.
async function assertSyncUser(userId: string): Promise<void> {
  const previous = await getAppMeta(SYNC_USER_KEY)

  if (previous && previous !== userId) {
    throw new Error(
      "A different user already synced on this device; reset local data first"
    )
  }

  if (previous !== userId) {
    await setAppMeta(SYNC_USER_KEY, userId)
  }
}

// One sync pass for the local transactions, against the API client.
export async function runSync(
  userId: string,
  client: SyncApiClient
): Promise<SyncSummary> {
  await assertSyncUser(userId)

  const deviceId = await getOrCreateDeviceId()

  return runSyncWithDeps(client, {
    createStore: () => createTransactionSyncStore(userId),
    createTransport: createSyncTransport,
    deviceId,
    initializeKey: initializeSyncKey,
    platform: Platform.OS,
    randomBytes,
    readKey: readSyncKey,
  })
}

// Start fresh: wipe the account's remote ciphertext and the local key/cursor so
// a device without the original key can generate a new one safely.
export async function resetSync(
  userId: string,
  client: SyncApiClient
): Promise<number> {
  const { deleted } = await client.sync.reset.mutate()

  await clearSyncKey()
  await clearSyncCursor(userId)
  await setAppMeta(SYNC_USER_KEY, "")

  return deleted
}
