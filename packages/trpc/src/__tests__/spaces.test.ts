import { describe, expect, it } from "bun:test"

import {
  canLeave,
  createSpaceInput,
  isOwner,
  redeemInviteInput,
  spacePullInput,
  spacePushInput,
  spaceRole,
} from "../spaces"

const UPDATED_AT = "2026-01-01T12:00:00.000Z"
// A hex-encoded SHA-256 hash, which is all the server ever sees of the token.
const INVITE_HASH = "a".repeat(64)

function blob(overrides: Record<string, unknown> = {}) {
  return {
    ciphertext: Buffer.from("secret").toString("base64"),
    id: "tx-1",
    updatedAt: UPDATED_AT,
    ...overrides,
  }
}

function space(overrides: Record<string, unknown> = {}) {
  return {
    inviteTokenHash: INVITE_HASH,
    keyId: "key-1",
    name: "Casa",
    wrappedKey: Buffer.from("wrapped").toString("base64"),
    ...overrides,
  }
}

describe("createSpaceInput", () => {
  it("accepts a valid space", () => {
    expect(createSpaceInput.safeParse(space()).success).toBe(true)
  })

  it("trims the name", () => {
    const result = createSpaceInput.safeParse(space({ name: "  Casa  " }))

    expect(result.success && result.data.name).toBe("Casa")
  })

  it("rejects a blank name", () => {
    expect(createSpaceInput.safeParse(space({ name: "   " })).success).toBe(
      false
    )
  })

  it("rejects a name over the cap", () => {
    expect(
      createSpaceInput.safeParse(space({ name: "x".repeat(61) })).success
    ).toBe(false)
  })

  it("rejects an invite hash that is not a hex sha-256", () => {
    expect(
      createSpaceInput.safeParse(space({ inviteTokenHash: "abc" })).success
    ).toBe(false)
    expect(
      createSpaceInput.safeParse(space({ inviteTokenHash: "A".repeat(64) }))
        .success
    ).toBe(false)
  })

  it("rejects a wrapped key that is not base64", () => {
    expect(
      createSpaceInput.safeParse(space({ wrappedKey: "not base64!!" })).success
    ).toBe(false)
  })

  it("rejects a payload without a key id", () => {
    expect(createSpaceInput.safeParse(space({ keyId: "" })).success).toBe(false)
  })
})

describe("redeemInviteInput", () => {
  it("accepts a valid hash", () => {
    expect(
      redeemInviteInput.safeParse({ inviteTokenHash: INVITE_HASH }).success
    ).toBe(true)
  })

  it("rejects a malformed hash", () => {
    expect(
      redeemInviteInput.safeParse({ inviteTokenHash: "nope" }).success
    ).toBe(false)
    expect(redeemInviteInput.safeParse({}).success).toBe(false)
  })
})

describe("spacePushInput", () => {
  it("accepts a valid batch scoped to a space", () => {
    const result = spacePushInput.safeParse({
      blobs: [blob()],
      deviceId: "device-1",
      spaceId: "space-1",
    })

    expect(result.success).toBe(true)
  })

  it("requires a space id", () => {
    const result = spacePushInput.safeParse({
      blobs: [blob()],
      deviceId: "device-1",
    })

    expect(result.success).toBe(false)
  })

  it("inherits the sync batch caps", () => {
    const result = spacePushInput.safeParse({
      blobs: Array.from({ length: 101 }, (_, index) =>
        blob({ id: `tx-${index}` })
      ),
      deviceId: "device-1",
      spaceId: "space-1",
    })

    expect(result.success).toBe(false)
  })
})

describe("spacePullInput", () => {
  it("accepts a null cursor", () => {
    expect(
      spacePullInput.safeParse({ since: null, spaceId: "space-1" }).success
    ).toBe(true)
  })

  it("requires a space id", () => {
    expect(spacePullInput.safeParse({ since: null }).success).toBe(false)
  })

  it("rejects an empty cursor", () => {
    expect(
      spacePullInput.safeParse({ since: "", spaceId: "space-1" }).success
    ).toBe(false)
  })
})

describe("space roles", () => {
  it("only accepts the known roles", () => {
    expect(spaceRole.safeParse("owner").success).toBe(true)
    expect(spaceRole.safeParse("member").success).toBe(true)
    expect(spaceRole.safeParse("admin").success).toBe(false)
  })

  it("lets members leave but not owners", () => {
    expect(canLeave("member")).toBe(true)
    expect(canLeave("owner")).toBe(false)
  })

  it("only owners can close a space", () => {
    expect(isOwner("owner")).toBe(true)
    expect(isOwner("member")).toBe(false)
  })
})
