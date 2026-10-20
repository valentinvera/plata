import { SPACE_ROLES } from "@plata/db/schema/spaces"
import { z } from "zod"

import { pushInput } from "./sync"

// Shared spaces reuse the encrypted sync primitives: the server only validates
// the shape of what it stores and never sees plaintext, the space key, or the
// invite token (it keeps a hash).

export const SPACE_NAME_MAX = 60
export const KEY_ID_MAX = 128
export const SPACE_ID_MAX = 64
const WRAPPED_KEY_BASE64_MAX = 1024
// Hex-encoded SHA-256 of the invite token.
const INVITE_TOKEN_HASH_REGEX = /^[a-f0-9]{64}$/

export const spaceRole = z.enum(SPACE_ROLES)

export type SpaceRole = z.infer<typeof spaceRole>

const spaceId = z.string().min(1).max(SPACE_ID_MAX)

export const createSpaceInput = z.object({
  inviteTokenHash: z.string().regex(INVITE_TOKEN_HASH_REGEX),
  keyId: z.string().min(1).max(KEY_ID_MAX),
  name: z.string().trim().min(1).max(SPACE_NAME_MAX),
  wrappedKey: z.base64().min(1).max(WRAPPED_KEY_BASE64_MAX),
})

export const redeemInviteInput = z.object({
  inviteTokenHash: z.string().regex(INVITE_TOKEN_HASH_REGEX),
})

export const spaceIdInput = z.object({ spaceId })

// safeExtend keeps the aggregate size refinement on `pushInput`; a plain
// extend is not the documented form once a schema carries checks.
export const spacePushInput = pushInput.safeExtend({ spaceId })

export const spacePullInput = z.object({
  since: z.string().min(1).nullish(),
  spaceId,
})

export type CreateSpaceInput = z.infer<typeof createSpaceInput>
export type RedeemInviteInput = z.infer<typeof redeemInviteInput>
export type SpaceIdInput = z.infer<typeof spaceIdInput>
export type SpacePushInput = z.infer<typeof spacePushInput>
export type SpacePullInput = z.infer<typeof spacePullInput>

// The owner closes a space instead of leaving it, so the shared data is never
// orphaned for the remaining members.
export function canLeave(role: SpaceRole): boolean {
  return role === "member"
}

export function isOwner(role: SpaceRole): boolean {
  return role === "owner"
}
