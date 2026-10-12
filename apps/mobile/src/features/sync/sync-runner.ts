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

export interface SyncRunnerDeps {
  createStore: () => SyncStore
  createTransport: (client: SyncApiClient) => SyncTransport
  deviceId: string
  initializeKey: () => Promise<Uint8Array>
  platform?: string
  randomBytes: RandomBytes
  readKey: () => Promise<Uint8Array | null>
}

// Runs a sync pass, deciding what to do about the key first. When this device
// has no key yet, starting fresh is only safe if the account has no remote
// data: otherwise we fail closed so the existing ciphertext is not orphaned.
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

  return syncNow({
    cipher: createCipher(key, deps.randomBytes),
    deviceId: deps.deviceId,
    platform: deps.platform,
    store: deps.createStore(),
    transport: deps.createTransport(client),
  })
}
