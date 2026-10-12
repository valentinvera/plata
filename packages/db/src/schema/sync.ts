import {
  bytea,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { user } from "./auth"

// Server-side model for the optional encrypted sync (see specs/schema.sql).
// The device keeps the plaintext; the server only ever stores opaque
// ciphertext. Blob and device ids come from the device, so they are opaque
// strings that are only unique per user (hence the composite keys).

export const device = pgTable(
  "devices",
  {
    id: text("id").notNull(),
    lastSyncAt: timestamp("last_sync_at"),
    platform: text("platform").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("devices_userId_idx").on(table.userId),
  ]
)

export const encryptedBlob = pgTable(
  "encrypted_blobs",
  {
    ciphertext: bytea("ciphertext").notNull(),
    // Client logical time, used only for last-write-wins conflict resolution.
    clientUpdatedAt: timestamp("client_updated_at").notNull(),
    deletedAt: timestamp("deleted_at"),
    id: text("id").notNull(),
    // Server-assigned ordering for the pull cursor, immune to device clocks.
    serverUpdatedAt: timestamp("server_updated_at").defaultNow().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("encrypted_blobs_userId_serverUpdatedAt_idx").on(
      table.userId,
      table.serverUpdatedAt,
      table.id
    ),
  ]
)

// One sync key identity per account. The server only stores a fingerprint so it
// can reject a second device that would otherwise bootstrap a different key.
export const syncAccount = pgTable("sync_accounts", {
  keyId: text("key_id").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
})
