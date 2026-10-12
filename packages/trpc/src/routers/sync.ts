import { device, encryptedBlob, syncAccount } from "@plata/db/schema/sync"
import { and, asc, eq, gt, or, type SQL, sql } from "drizzle-orm"

import { protectedProcedure, router } from "../index"
import {
  decodeCursor,
  encodeCursor,
  pullInput,
  pushInput,
  reserveKeyInput,
  type SyncBlobInput,
  storeRecoveryInput,
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

  // Atomically claims the account's sync key identity. The first caller sets
  // it; later callers get the stored fingerprint back, so a device can detect
  // that its own key does not match and fail closed instead of uploading
  // ciphertext other devices cannot decrypt.
  reserveKey: protectedProcedure
    .input(reserveKeyInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const [row] = await ctx.db
        .insert(syncAccount)
        .values({ keyId: input.keyId, userId })
        .onConflictDoUpdate({
          set: { keyId: sql`${syncAccount.keyId}` },
          target: syncAccount.userId,
        })
        .returning({ keyId: syncAccount.keyId })

      return { keyId: row?.keyId ?? input.keyId }
    }),

  // Stores the sync key wrapped with the user's recovery secret. The server
  // only keeps the ciphertext, never the key nor the secret.
  storeRecovery: protectedProcedure
    .input(storeRecoveryInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const rows = await ctx.db
        .update(syncAccount)
        .set({
          updatedAt: new Date(),
          wrappedKey: Buffer.from(input.wrappedKey, "base64"),
        })
        .where(eq(syncAccount.userId, userId))
        .returning({ userId: syncAccount.userId })

      return { stored: rows.length > 0 }
    }),

  getRecovery: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const rows = await ctx.db
      .select({ wrappedKey: syncAccount.wrappedKey })
      .from(syncAccount)
      .where(eq(syncAccount.userId, userId))
      .limit(1)
    const wrapped = rows[0]?.wrappedKey ?? null

    return { wrappedKey: wrapped ? wrapped.toString("base64") : null }
  }),

  // Wipes the user's ciphertext so a device that lost its sync key can start
  // fresh instead of generating a key that cannot decrypt existing blobs.
  reset: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const deleted = await ctx.db
      .delete(encryptedBlob)
      .where(eq(encryptedBlob.userId, userId))
      .returning({ id: encryptedBlob.id })

    await ctx.db.delete(syncAccount).where(eq(syncAccount.userId, userId))

    return { deleted: deleted.length }
  }),
})
