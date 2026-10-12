import { device, encryptedBlob } from "@plata/db/schema/sync"
import { and, asc, eq, gt, or, type SQL, sql } from "drizzle-orm"

import { protectedProcedure, router } from "../index"
import {
  decodeCursor,
  encodeCursor,
  pullInput,
  pushInput,
  type SyncBlobInput,
} from "../sync"

const PULL_LIMIT = 500

function dedupeById(blobs: readonly SyncBlobInput[]): SyncBlobInput[] {
  const byId = new Map<string, SyncBlobInput>()

  for (const blob of blobs) {
    byId.set(blob.id, blob)
  }

  return [...byId.values()]
}

export const syncRouter = router({
  pull: protectedProcedure.input(pullInput).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id
    const cursor = decodeCursor(input?.since)

    const conditions: (SQL | undefined)[] = [eq(encryptedBlob.userId, userId)]

    if (cursor) {
      conditions.push(
        or(
          gt(encryptedBlob.serverUpdatedAt, cursor.updatedAt),
          and(
            eq(encryptedBlob.serverUpdatedAt, cursor.updatedAt),
            gt(encryptedBlob.id, cursor.id)
          )
        )
      )
    }

    const rows = await ctx.db
      .select()
      .from(encryptedBlob)
      .where(and(...conditions))
      .orderBy(asc(encryptedBlob.serverUpdatedAt), asc(encryptedBlob.id))
      .limit(PULL_LIMIT)

    const blobs = rows.map((row) => ({
      ciphertext: row.ciphertext.toString("base64"),
      deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
      id: row.id,
      updatedAt: row.clientUpdatedAt.toISOString(),
    }))

    const last = rows.at(-1)
    const nextCursor = last
      ? encodeCursor({ id: last.id, updatedAt: last.serverUpdatedAt })
      : (input?.since ?? null)

    return { blobs, cursor: nextCursor }
  }),

  push: protectedProcedure.input(pushInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id
    const now = new Date()
    const platform = input.platform ?? "unknown"

    await ctx.db
      .insert(device)
      .values({ id: input.deviceId, lastSyncAt: now, platform, userId })
      .onConflictDoUpdate({
        set: { lastSyncAt: now, platform },
        target: [device.userId, device.id],
      })

    const blobs = dedupeById(input.blobs)
    let accepted: string[] = []

    if (blobs.length > 0) {
      const rows = await ctx.db
        .insert(encryptedBlob)
        .values(
          blobs.map((blob) => ({
            ciphertext: Buffer.from(blob.ciphertext, "base64"),
            clientUpdatedAt: new Date(blob.updatedAt),
            deletedAt: blob.deletedAt ? new Date(blob.deletedAt) : null,
            id: blob.id,
            userId,
          }))
        )
        // Last-write-wins on the client logical time; ties favor the incoming
        // copy so replays stay deterministic. Stale pushes never bump the
        // server revision, so they cannot hide newer data from pull.
        .onConflictDoUpdate({
          set: {
            ciphertext: sql`excluded.ciphertext`,
            clientUpdatedAt: sql`excluded.client_updated_at`,
            deletedAt: sql`excluded.deleted_at`,
            serverUpdatedAt: sql`now()`,
          },
          setWhere: sql`excluded.client_updated_at >= ${encryptedBlob.clientUpdatedAt}`,
          target: [encryptedBlob.userId, encryptedBlob.id],
        })
        // Only rows actually written are returned, so a client can tell which
        // of its versions the server accepted.
        .returning({ id: encryptedBlob.id })

      accepted = rows.map((row) => row.id)
    }

    return { accepted }
  }),
})
