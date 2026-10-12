import { Platform } from "react-native"

import { getAppMeta, setAppMeta } from "../transactions/app-meta-repository"
import { createId } from "../transactions/id"
import { syncNow } from "./engine"
import { createTransactionSyncStore } from "./sync-store"
import { createSyncTransport, type SyncApiClient } from "./sync-transport"
import type { SyncCipher, SyncSummary } from "./types"

const DEVICE_ID_KEY = "sync_device_id"

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getAppMeta(DEVICE_ID_KEY)

  if (existing && existing.length > 0) {
    return existing
  }

  const id = createId()
  await setAppMeta(DEVICE_ID_KEY, id)

  return id
}

// One sync pass for the local transactions, against the API client.
export async function syncTransactions(
  cipher: SyncCipher,
  client: SyncApiClient
): Promise<SyncSummary> {
  const deviceId = await getOrCreateDeviceId()

  return syncNow({
    cipher,
    deviceId,
    platform: Platform.OS,
    store: createTransactionSyncStore(),
    transport: createSyncTransport(client),
  })
}
