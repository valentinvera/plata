import { Platform } from "react-native"

import { getAppMeta, setAppMeta } from "../transactions/app-meta-repository"
import { createId } from "../transactions/id"
import { syncNow } from "./engine"
import { createTransactionSyncStore } from "./sync-store"
import { createSyncTransport, type SyncApiClient } from "./sync-transport"
import type { SyncCipher, SyncSummary } from "./types"

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
export async function syncTransactions(
  userId: string,
  cipher: SyncCipher,
  client: SyncApiClient
): Promise<SyncSummary> {
  await assertSyncUser(userId)

  const deviceId = await getOrCreateDeviceId()

  return syncNow({
    cipher,
    deviceId,
    platform: Platform.OS,
    store: createTransactionSyncStore(userId),
    transport: createSyncTransport(client),
  })
}
