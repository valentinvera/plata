import { createCipher, type RandomBytes } from "./crypto"
import { syncNow } from "./engine"
import type { SyncApiClient } from "./sync-transport"
import type { SyncStore, SyncSummary, SyncTransport } from "./types"

export class SyncKeyMissingError extends Error {
  constructor() {
    super("This account already has synced data; recover or reset the sync key")
    this.name = "SyncKeyMissingError"
  }
}

export class SyncKeyMismatchError extends Error {
  constructor() {
    super("This device's sync key does not match the account's key")
    this.name = "SyncKeyMismatchError"
  }
}

export interface SyncRunnerDeps {
  createStore: () => SyncStore
  createTransport: (client: SyncApiClient) => SyncTransport
  deviceId: string
  initializeKey: () => Promise<Uint8Array>
  keyId: (key: Uint8Array) => Promise<string>
  platform?: string
  randomBytes: RandomBytes
  readKey: () => Promise<Uint8Array | null>
}

// Runs a sync pass, resolving the account-wide key identity first. A device
// without a key may only bootstrap one when the account has no data; otherwise
// it fails closed. The reserved key id then guards against two devices
// bootstrapping different keys for the same account.
export async function runSyncWithDeps(
  client: SyncApiClient,
  deps: SyncRunnerDeps
): Promise<SyncSummary> {
  let key = await deps.readKey()

  if (!key) {
    const { blobs } = await client.sync.pull.query({ since: null })

    if (blobs.length > 0) {
      throw new SyncKeyMissingError()
    }

    key = await deps.initializeKey()
  }

  const keyId = await deps.keyId(key)
  const reserved = await client.sync.reserveKey.mutate({ keyId })

  if (reserved.keyId !== keyId) {
    throw new SyncKeyMismatchError()
  }

  return syncNow({
    cipher: createCipher(key, deps.randomBytes),
    deviceId: deps.deviceId,
    platform: deps.platform,
    store: deps.createStore(),
    transport: deps.createTransport(client),
  })
}
