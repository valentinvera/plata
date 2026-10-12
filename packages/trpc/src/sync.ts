import { z } from "zod"

// The server never sees plaintext: payloads only carry opaque ciphertext
// blobs (see specs/openapi.yaml). Validation happens at the edge.

// Transactions are tiny, so a small per-blob cap is plenty. 64 KiB decoded
// per blob, at most 100 blobs and 4 MiB per push keeps requests bounded.
// The mobile sync client imports these so its batches never exceed the limits.
export const MAX_BLOB_BYTES = 64 * 1024
export const MAX_BLOBS_PER_PUSH = 100
export const MAX_PUSH_BYTES = 4 * 1024 * 1024
// base64 expands to roughly 4/3 of the decoded size.
export const MAX_BLOB_BASE64_LENGTH = Math.ceil(MAX_BLOB_BYTES / 3) * 4

const blobInput = z.object({
  ciphertext: z.base64().min(1).max(MAX_BLOB_BASE64_LENGTH),
  deletedAt: z.iso.datetime().nullish(),
  id: z.string().min(1),
  updatedAt: z.iso.datetime(),
})

export const pushInput = z
  .object({
    blobs: z.array(blobInput).max(MAX_BLOBS_PER_PUSH),
    deviceId: z.string().min(1),
    platform: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      value.blobs.reduce(
        (total, blob) => total + base64DecodedLength(blob.ciphertext),
        0
      ) <= MAX_PUSH_BYTES,
    { message: "push payload is too large", path: ["blobs"] }
  )

export const pullInput = z
  .object({
    since: z.string().min(1).nullish(),
  })
  .optional()

export type PushInput = z.infer<typeof pushInput>
export type PullInput = z.infer<typeof pullInput>
export type SyncBlobInput = z.infer<typeof blobInput>

export interface SyncCursor {
  id: string
  updatedAt: Date
}

export function base64DecodedLength(value: string): number {
  if (value.endsWith("==")) {
    return (value.length * 3) / 4 - 2
  }

  if (value.endsWith("=")) {
    return (value.length * 3) / 4 - 1
  }

  return (value.length * 3) / 4
}

// The pull cursor is a compound (serverUpdatedAt, id) position. The id breaks
// ties so rows sharing a timestamp are never skipped across pages.
export function encodeCursor(cursor: SyncCursor): string {
  return `${cursor.updatedAt.getTime()}:${encodeURIComponent(cursor.id)}`
}

export function decodeCursor(
  value: string | null | undefined
): SyncCursor | null {
  if (!value) {
    return null
  }

  const separator = value.indexOf(":")
  if (separator <= 0) {
    return null
  }

  const millis = Number(value.slice(0, separator))
  if (!Number.isFinite(millis)) {
    return null
  }

  try {
    const id = decodeURIComponent(value.slice(separator + 1))

    return id.length > 0 ? { id, updatedAt: new Date(millis) } : null
  } catch {
    return null
  }
}
