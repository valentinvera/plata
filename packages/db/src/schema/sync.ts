import {
  bytea,
  foreignKey,
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
    deletedAt: timestamp("deleted_at"),
    id: text("id").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("encrypted_blobs_userId_updatedAt_idx").on(
      table.userId,
      table.updatedAt
    ),
  ]
)

export const syncCursor = pgTable(
  "sync_cursors",
  {
    cursor: text("cursor"),
    deviceId: text("device_id").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.deviceId] }),
    foreignKey({
      columns: [table.userId, table.deviceId],
      foreignColumns: [device.userId, device.id],
    }).onDelete("cascade"),
  ]
)
