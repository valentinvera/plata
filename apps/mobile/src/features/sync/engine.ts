import { decodeRecord, encodeRecord } from "./codec"
import { shouldApplyRemote } from "./merge"
import type { SyncCipher, SyncStore, SyncSummary, SyncTransport } from "./types"

export interface SyncEngineOptions {
  cipher: SyncCipher
  deviceId: string
  platform?: string
  store: SyncStore
  transport: SyncTransport
}

// Runs one sync pass: push local changes, then pull and apply remote changes.
export async function syncNow(
  options: SyncEngineOptions
): Promise<SyncSummary> {
  const { cipher, deviceId, platform, store, transport } = options

  const dirty = await store.listDirty()

  if (dirty.length > 0) {
    await transport.push({
      blobs: dirty.map((record) => encodeRecord(record, cipher)),
      deviceId,
      platform,
    })
    await store.markSynced(dirty.map((record) => record.id))
  }

  const since = await store.getCursor()
  const { blobs, cursor } = await transport.pull({ since })

  const remotes = blobs.map((blob) => decodeRecord(blob, cipher))
  const locals = await Promise.all(
    remotes.map((remote) => store.getRecord(remote.id))
  )
  const toApply = remotes.filter((remote, index) =>
    shouldApplyRemote(locals[index] ?? null, remote)
  )

  await Promise.all(toApply.map((remote) => store.applyRemote(remote)))

  if (cursor !== since) {
    await store.setCursor(cursor)
  }

  return { applied: toApply.length, pulled: blobs.length, pushed: dirty.length }
}
