import { randomUUID } from "node:crypto"

import type { Database } from "@plata/db"
import { space, spaceBlob, spaceMember } from "@plata/db/schema/spaces"
import { TRPCError } from "@trpc/server"
import { and, asc, eq, gt, or, type SQL, sql } from "drizzle-orm"

import { protectedProcedure, router } from "../index"
import {
  canLeave,
  createSpaceInput,
  isOwner,
  redeemInviteInput,
  spaceIdInput,
  spacePullInput,
  spacePushInput,
  spaceRole,
} from "../spaces"
import { decodeCursor, dedupeBlobsById, encodeCursor } from "../sync"

const PULL_LIMIT = 500

type SpaceDb = Pick<Database, "select">

// Every read and write is scoped to a space, so it always checks membership
// first. Non-members get a 403 instead of an empty result, so a wrong id cannot
// be confused with an empty space.
async function roleFor(db: SpaceDb, spaceId: string, userId: string) {
  const rows = await db
    .select({ role: spaceMember.role })
    .from(spaceMember)
    .where(
      and(eq(spaceMember.spaceId, spaceId), eq(spaceMember.userId, userId))
    )
    .limit(1)

  const role = rows[0]?.role

  if (!role) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this space",
    })
  }

  return spaceRole.parse(role)
}

export const spacesRouter = router({
  create: protectedProcedure
    .input(createSpaceInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const id = randomUUID()

      await ctx.db.transaction(async (tx) => {
        const created = await tx
          .insert(space)
          .values({
            id,
            inviteTokenHash: input.inviteTokenHash,
            keyId: input.keyId,
            name: input.name,
            ownerId: userId,
            wrappedKey: Buffer.from(input.wrappedKey, "base64"),
          })
          // The hash is unique, so a replayed invite cannot claim a second space.
          .onConflictDoNothing({ target: space.inviteTokenHash })
          .returning({ id: space.id })

        if (created.length === 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That invite is already in use",
          })
        }

        await tx.insert(spaceMember).values({
          role: "owner",
          spaceId: id,
          userId,
        })
      })

      return { id }
    }),

  // Redeeming is idempotent: a member that lost the key, or a second device,
  // can redeem the same invite again and get the wrapped key back.
  redeem: protectedProcedure
    .input(redeemInviteInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const rows = await ctx.db
        .select()
        .from(space)
        .where(eq(space.inviteTokenHash, input.inviteTokenHash))
        .limit(1)

      const [found] = rows

      if (!found) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "That invite is not valid",
        })
      }

      await ctx.db
        .insert(spaceMember)
        .values({ role: "member", spaceId: found.id, userId })
        .onConflictDoNothing()

      return {
        id: found.id,
        keyId: found.keyId,
        name: found.name,
        wrappedKey: found.wrappedKey.toString("base64"),
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const rows = await ctx.db
      .select({
        id: space.id,
        joinedAt: spaceMember.joinedAt,
        keyId: space.keyId,
        name: space.name,
        ownerId: space.ownerId,
        role: spaceMember.role,
      })
      .from(spaceMember)
      .innerJoin(space, eq(spaceMember.spaceId, space.id))
      .where(eq(spaceMember.userId, userId))
      .orderBy(asc(space.createdAt), asc(space.id))

    return { spaces: rows }
  }),

  leave: protectedProcedure
    .input(spaceIdInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const role = await roleFor(ctx.db, input.spaceId, userId)

      if (!canLeave(role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "The owner cannot leave a space",
        })
      }

      await ctx.db
        .delete(spaceMember)
        .where(
          and(
            eq(spaceMember.spaceId, input.spaceId),
            eq(spaceMember.userId, userId)
          )
        )

      return { left: true }
    }),

  // Only the owner can close a space; the cascade removes its members and blobs.
  remove: protectedProcedure
    .input(spaceIdInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const role = await roleFor(ctx.db, input.spaceId, userId)

      if (!isOwner(role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the owner can close a space",
        })
      }

      await ctx.db.delete(space).where(eq(space.id, input.spaceId))

      return { removed: true }
    }),

  push: protectedProcedure
    .input(spacePushInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await roleFor(ctx.db, input.spaceId, userId)

      const blobs = dedupeBlobsById(input.blobs)
      let accepted: string[] = []

      if (blobs.length > 0) {
        const rows = await ctx.db
          .insert(spaceBlob)
          .values(
            blobs.map((blob) => ({
              ciphertext: Buffer.from(blob.ciphertext, "base64"),
              clientUpdatedAt: new Date(blob.updatedAt),
              deletedAt: blob.deletedAt ? new Date(blob.deletedAt) : null,
              id: blob.id,
              spaceId: input.spaceId,
            }))
          )
          // Last-write-wins on the client logical time, like personal sync, so
          // two members editing offline converge the same way.
          .onConflictDoUpdate({
            set: {
              ciphertext: sql`excluded.ciphertext`,
              clientUpdatedAt: sql`excluded.client_updated_at`,
              deletedAt: sql`excluded.deleted_at`,
              serverUpdatedAt: sql`now()`,
            },
            setWhere: sql`excluded.client_updated_at >= ${spaceBlob.clientUpdatedAt}`,
            target: [spaceBlob.spaceId, spaceBlob.id],
          })
          .returning({ id: spaceBlob.id })

        accepted = rows.map((row) => row.id)
      }

      return { accepted }
    }),

  pull: protectedProcedure
    .input(spacePullInput)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await roleFor(ctx.db, input.spaceId, userId)

      const cursor = decodeCursor(input.since)
      const conditions: (SQL | undefined)[] = [
        eq(spaceBlob.spaceId, input.spaceId),
      ]

      if (cursor) {
        conditions.push(
          or(
            gt(spaceBlob.serverUpdatedAt, cursor.updatedAt),
            and(
              eq(spaceBlob.serverUpdatedAt, cursor.updatedAt),
              gt(spaceBlob.id, cursor.id)
            )
          )
        )
      }

      const rows = await ctx.db
        .select()
        .from(spaceBlob)
        .where(and(...conditions))
        .orderBy(asc(spaceBlob.serverUpdatedAt), asc(spaceBlob.id))
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
        : (input.since ?? null)

      return { blobs, cursor: nextCursor }
    }),
})
