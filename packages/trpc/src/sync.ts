import { z } from "zod"

// The server never sees plaintext: payloads only carry opaque ciphertext
// blobs (see specs/openapi.yaml). Validation happens at the edge.

const blobInput = z.object({
  ciphertext: z.base64().min(1),
  deletedAt: z.iso.datetime().nullish(),
  id: z.string().min(1),
  updatedAt: z.iso.datetime(),
})

export const pushInput = z.object({
  blobs: z.array(blobInput).max(500),
  deviceId: z.string().min(1),
  platform: z.string().min(1).optional(),
})

export const pullInput = z
  .object({
    since: z.iso.datetime().nullish(),
  })
  .optional()

export type PushInput = z.infer<typeof pushInput>
export type PullInput = z.infer<typeof pullInput>
export type SyncBlobInput = z.infer<typeof blobInput>

// The sync cursor is the ISO timestamp of the newest blob a device has seen.
export function toCursor(updatedAt: Date): string {
  return updatedAt.toISOString()
}

export function parseSince(since: string | null | undefined): Date | null {
  if (!since) {
    return null
  }

  const date = new Date(since)

  return Number.isNaN(date.getTime()) ? null : date
}
