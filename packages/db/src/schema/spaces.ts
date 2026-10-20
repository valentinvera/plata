import {
  bytea,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { user } from "./auth"

// Server-side model for the optional shared spaces (couple/family) on top of the
// encrypted sync. Like sync, the server only ever stores opaque ciphertext plus
// the space key wrapped with a secret derived from the invite token; the
// plaintext and the space key never leave the devices.

export const SPACE_ROLES = ["owner", "member"] as const

export const space = pgTable(
  "spaces",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    // Hash of the invite token, never the token itself, so a leaked database
    // dump still cannot be turned into the space key without the token.
    inviteTokenHash: text("invite_token_hash").notNull(),
    // Client fingerprint of the space key, so a device can detect a mismatch
    // instead of merging data encrypted with a different key.
    keyId: text("key_id").notNull(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The space key wrapped with a secret derived from the invite token.
    wrappedKey: bytea("wrapped_key").notNull(),
  },
  (table) => [
    uniqueIndex("spaces_inviteTokenHash_idx").on(table.inviteTokenHash),
    index("spaces_ownerId_idx").on(table.ownerId),
  ]
)

export const spaceMember = pgTable(
  "space_members",
  {
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    role: text("role").notNull(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.userId] }),
    index("space_members_userId_idx").on(table.userId),
  ]
)

export const spaceBlob = pgTable(
  "space_blobs",
  {
    ciphertext: bytea("ciphertext").notNull(),
    // Client logical time, used only for last-write-wins conflict resolution.
    clientUpdatedAt: timestamp("client_updated_at").notNull(),
    deletedAt: timestamp("deleted_at"),
    id: text("id").notNull(),
    // Server-assigned ordering for the pull cursor, immune to device clocks.
    serverUpdatedAt: timestamp("server_updated_at").defaultNow().notNull(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.id] }),
    index("space_blobs_spaceId_serverUpdatedAt_idx").on(
      table.spaceId,
      table.serverUpdatedAt,
      table.id
    ),
  ]
)
