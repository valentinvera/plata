import {
  base64DecodedLength,
  MAX_BLOB_BYTES,
  MAX_BLOBS_PER_PUSH,
  MAX_PUSH_BYTES,
} from "@plata/trpc/sync"

import { decodeRecord, encodeRecord } from "./codec"
import { shouldApplyRemote } from "./merge"
import type {
  SyncBlob,
  SyncCipher,
  SyncRecord,
  SyncStore,
  SyncSummary,
  SyncTransport,
  SyncVersion,
} from "./types"

export interface SyncEngineOptions {
  cipher: SyncCipher
  deviceId: string
  platform?: string
  store: SyncStore
  transport: SyncTransport
}

interface PushBatch {
  blobs: SyncBlob[]
  versions: SyncVersion[]
}

// Splits dirty records into batches that satisfy the server's push limits
// (blob count and total payload size) so a large backlog still syncs.
export function planPushBatches(
  records: readonly SyncRecord[],
  cipher: SyncCipher
): PushBatch[] {
  const batches: PushBatch[] = []
  let blobs: SyncBlob[] = []
  let versions: SyncVersion[] = []
  let bytes = 0

  for (const record of records) {
    const blob = encodeRecord(record, cipher)
    const size = base64DecodedLength(blob.ciphertext)

    if (size > MAX_BLOB_BYTES) {
      throw new Error(`Sync record ${record.id} exceeds the maximum blob size`)
    }

    if (
      blobs.length > 0 &&
      (blobs.length >= MAX_BLOBS_PER_PUSH || bytes + size > MAX_PUSH_BYTES)
    ) {
      batches.push({ blobs, versions })
      blobs = []
      versions = []
      bytes = 0
    }

    blobs.push(blob)
    versions.push({ id: record.id, updatedAt: record.updatedAt })
    bytes += size
  }

  if (blobs.length > 0) {
    batches.push({ blobs, versions })
  }

  return batches
}

// Runs one sync pass: push local changes, then pull and apply remote changes.
export async function syncNow(
  options: SyncEngineOptions
): Promise<SyncSummary> {
  const { cipher, deviceId, platform, store, transport } = options

  const dirty = await store.listDirty()
  const batches = planPushBatches(dirty, cipher)
  let pushed = 0

  // Pushes stay sequential: the server orders revisions, so a later batch must
  // not overtake an earlier one.
  for (const batch of batches) {
    // biome-ignore lint/performance/noAwaitInLoops: pushes must run in order
    const { accepted } = await transport.push({
      blobs: batch.blobs,
      deviceId,
      platform,
    })
    // Only acknowledge versions the server actually wrote: a stale version the
    // server rejected must stay dirty so it is not silently dropped.
    const acceptedIds = new Set(accepted)
    await store.markSynced(
      batch.versions.filter((version) => acceptedIds.has(version.id))
    )
    pushed += batch.blobs.length
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

  return { applied: toApply.length, pulled: blobs.length, pushed }
}
