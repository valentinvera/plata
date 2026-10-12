import { describe, expect, it } from "bun:test"

import { createSyncTransport, type SyncApiClient } from "../sync-transport"
import type { SyncBlob } from "../types"

const BLOB: SyncBlob = {
  ciphertext: "AA==",
  deletedAt: null,
  id: "tx-1",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

describe("createSyncTransport", () => {
  it("forwards push input and returns the accepted ids", async () => {
    const calls: unknown[] = []
    const client: SyncApiClient = {
      sync: {
        pull: { query: () => Promise.resolve({ blobs: [], cursor: null }) },
        push: {
          mutate: (input) => {
            calls.push(input)

            return Promise.resolve({
              accepted: input.blobs.map((blob) => blob.id),
            })
          },
        },
        reset: { mutate: () => Promise.resolve({ deleted: 0 }) },
      },
    }

    const transport = createSyncTransport(client)
    const result = await transport.push({
      blobs: [BLOB],
      deviceId: "device-1",
    })

    expect(result).toEqual({ accepted: ["tx-1"] })
    expect(calls).toEqual([{ blobs: [BLOB], deviceId: "device-1" }])
  })

  it("forwards pull input and returns the response", async () => {
    const client: SyncApiClient = {
      sync: {
        pull: {
          query: (input) =>
            Promise.resolve({ blobs: [BLOB], cursor: `cursor-${input.since}` }),
        },
        push: { mutate: () => Promise.resolve({ accepted: [] }) },
        reset: { mutate: () => Promise.resolve({ deleted: 0 }) },
      },
    }

    const transport = createSyncTransport(client)

    expect(await transport.pull({ since: "x" })).toEqual({
      blobs: [BLOB],
      cursor: "cursor-x",
    })
  })
})
