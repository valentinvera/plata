import { device, encryptedBlob, syncCursor } from "@plata/db/schema/sync"
import { and, asc, eq, gt, sql } from "drizzle-orm"

import { protectedProcedure, router } from "../index"
import { parseSince, pullInput, pushInput, toCursor } from "../sync"

const PULL_LIMIT = 500

export const syncRouter = router({
  pull: protectedProcedure.input(pullInput).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id
    const since = parseSince(input?.since)

    const rows = await ctx.db
      .select()
      .from(encryptedBlob)
      .where(
        since
          ? and(
              eq(encryptedBlob.userId, userId),
              gt(encryptedBlob.updatedAt, since)
            )
          : eq(encryptedBlob.userId, userId)
      )
      .orderBy(asc(encryptedBlob.updatedAt))
      .limit(PULL_LIMIT)

    const blobs = rows.map((row) => ({
      ciphertext: row.ciphertext.toString("base64"),
      deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
      id: row.id,
      updatedAt: row.updatedAt.toISOString(),
    }))

    const last = blobs.at(-1)
    const cursor = last ? last.updatedAt : toCursor(since ?? new Date(0))

    return { blobs, cursor }
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

    if (input.blobs.length > 0) {
      await ctx.db
        .insert(encryptedBlob)
        .values(
          input.blobs.map((blob) => ({
            ciphertext: Buffer.from(blob.ciphertext, "base64"),
            deletedAt: blob.deletedAt ? new Date(blob.deletedAt) : null,
            id: blob.id,
            updatedAt: new Date(blob.updatedAt),
            userId,
          }))
        )
        .onConflictDoUpdate({
          set: {
            ciphertext: sql`excluded.ciphertext`,
            deletedAt: sql`excluded.deleted_at`,
            updatedAt: sql`excluded.updated_at`,
          },
          target: [encryptedBlob.userId, encryptedBlob.id],
        })
    }

    const cursor = toCursor(now)

    await ctx.db
      .insert(syncCursor)
      .values({ cursor, deviceId: input.deviceId, updatedAt: now, userId })
      .onConflictDoUpdate({
        set: { cursor, updatedAt: now },
        target: [syncCursor.userId, syncCursor.deviceId],
      })

    return { applied: input.blobs.length, cursor }
  }),
})
