import {
  keyFingerprint,
  randomBytes,
  readSyncKey,
  storeSyncKey,
} from "./key-store"
import { decodeRecoverySecret, unwrapSyncKey, wrapSyncKey } from "./recovery"
import { SyncKeyMismatchError } from "./sync-runner"
import type { SyncApiClient } from "./sync-transport"

// Wraps the local sync key with the recovery secret and stores it on the server
// so another device can restore it.
export async function backupSyncKey(
  secret: string,
  client: SyncApiClient
): Promise<void> {
  const syncKey = await readSyncKey()
  const recoveryKey = decodeRecoverySecret(secret)

  if (!(syncKey && recoveryKey)) {
    throw new Error(
      "Cannot back up the sync key without a local key and a valid recovery secret"
    )
  }

  const keyId = await keyFingerprint(syncKey)
  const reserved = await client.sync.reserveKey.mutate({ keyId })

  if (reserved.keyId !== keyId) {
    throw new SyncKeyMismatchError()
  }

  const { stored } = await client.sync.storeRecovery.mutate({
    keyId,
    wrappedKey: wrapSyncKey(syncKey, recoveryKey, randomBytes),
  })

  if (!stored) {
    throw new SyncKeyMismatchError()
  }
}

// Restores the sync key from the server using the recovery secret. Returns
// false when nothing is stored or the secret does not match.
export async function recoverSyncKey(
  secret: string,
  client: SyncApiClient
): Promise<boolean> {
  const recoveryKey = decodeRecoverySecret(secret)

  if (!recoveryKey) {
    throw new Error("Invalid recovery secret")
  }

  const { wrappedKey } = await client.sync.getRecovery.query()

  if (!wrappedKey) {
    return false
  }

  const syncKey = unwrapSyncKey(wrappedKey, recoveryKey)

  if (!syncKey) {
    return false
  }

  await storeSyncKey(syncKey)

  return true
}
