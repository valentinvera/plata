import { initializeSyncKey, randomBytes, readSyncKey } from "./key-store"
import { generateRecoverySecret } from "./recovery"
import { backupSyncKey } from "./sync-recovery"
import { resolveSyncSetupState, type SyncSetupState } from "./sync-setup-state"
import type { SyncApiClient } from "./sync-transport"

export type { SyncSetupState } from "./sync-setup-state"

// Works out how this device can start syncing: it already has a key, it can
// restore one from a recovery code, it must reset unrecoverable data, or it is
// a fresh account that can create a new key.
export async function getSyncSetupState(
  client: SyncApiClient
): Promise<SyncSetupState> {
  if (await readSyncKey()) {
    return "ready"
  }

  const { wrappedKey } = await client.sync.getRecovery.query()

  if (wrappedKey) {
    return "needs-recovery"
  }

  const { blobs } = await client.sync.pull.query({ since: null })

  return resolveSyncSetupState({
    hasKey: false,
    hasRemoteData: blobs.length > 0,
    hasWrappedKey: false,
  })
}

// Creates the account's sync key and backs it up with a fresh recovery secret.
export async function createSyncBackup(client: SyncApiClient): Promise<string> {
  const secret = generateRecoverySecret(randomBytes)

  await initializeSyncKey()
  await backupSyncKey(secret, client)

  return secret
}
