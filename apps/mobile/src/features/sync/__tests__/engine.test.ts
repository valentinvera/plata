import { describe, expect, it } from "bun:test"

import { encodeRecord } from "../codec"
import { createCipher } from "../crypto"
import { syncNow } from "../engine"
import type { SyncBlob, SyncRecord, SyncStore, SyncTransport } from "../types"

const cipher = createCipher(new Uint8Array(32).fill(5), (length) =>
  new Uint8Array(length).fill(2)
)

function record(overrides: Partial<SyncRecord> = {}): SyncRecord {
  return {
    deletedAt: null,
    id: "tx-1",
    payload: JSON.stringify({ amount: 100 }),
    updatedAt: 100,
    ...overrides,
  }
}

function createStore(initial: SyncRecord[] = []) {
  const records = new Map(initial.map((item) => [item.id, item]))
  const dirty = new Set(initial.map((item) => item.id))
  const applied: SyncRecord[] = []
  let cursor: string | null = null

  const store: SyncStore = {
    applyRemote: (value) => {
      records.set(value.id, value)
      applied.push(value)

      return Promise.resolve()
    },
    getCursor: () => Promise.resolve(cursor),
    getRecord: (id) => Promise.resolve(records.get(id) ?? null),
    listDirty: () =>
      Promise.resolve(
        [...dirty]
          .map((id) => records.get(id))
          .filter((value): value is SyncRecord => Boolean(value))
      ),
    markSynced: (ids) => {
      for (const id of ids) {
        dirty.delete(id)
      }

      return Promise.resolve()
    },
    setCursor: (value) => {
      cursor = value

      return Promise.resolve()
    },
  }

  return { applied, dirty, store, getCursor: () => cursor }
}

function createTransport(
  responses: { blobs?: SyncBlob[]; cursor?: string | null }[] = []
) {
  const pushes: { blobs: SyncBlob[]; deviceId: string }[] = []
  let index = 0

  const transport: SyncTransport = {
    pull: () => {
      const response = responses[index] ?? { blobs: [], cursor: null }
      index += 1

      return Promise.resolve({
        blobs: response.blobs ?? [],
        cursor: response.cursor ?? null,
      })
    },
    push: (input) => {
      pushes.push(input)

      return Promise.resolve({ applied: input.blobs.length })
    },
  }

  return { pushes, transport }
}

describe("syncNow", () => {
  it("pushes dirty records and marks them synced", async () => {
    const { dirty, store } = createStore([record()])
    const { pushes, transport } = createTransport([{ blobs: [], cursor: null }])

    const summary = await syncNow({
      cipher,
      deviceId: "device-1",
      store,
      transport,
    })

    expect(pushes).toHaveLength(1)
    expect(pushes[0].blobs[0].id).toBe("tx-1")
    expect(dirty.size).toBe(0)
    expect(summary.pushed).toBe(1)
  })

  it("does not push when there is nothing dirty", async () => {
    const { store } = createStore()
    const { pushes, transport } = createTransport([{ blobs: [], cursor: null }])

    await syncNow({ cipher, deviceId: "device-1", store, transport })

    expect(pushes).toHaveLength(0)
  })

  it("applies pulled records and stores the cursor", async () => {
    const remote = record({ id: "tx-2", updatedAt: 500 })
    const { applied, getCursor, store } = createStore()
    const { transport } = createTransport([
      { blobs: [encodeRecord(remote, cipher)], cursor: "cursor-1" },
    ])

    const summary = await syncNow({
      cipher,
      deviceId: "device-1",
      store,
      transport,
    })

    expect(applied).toEqual([remote])
    expect(getCursor()).toBe("cursor-1")
    expect(summary).toEqual({ applied: 1, pulled: 1, pushed: 0 })
  })

  it("skips remote records older than the local copy", async () => {
    const local = record({ updatedAt: 900 })
    const remote = record({ updatedAt: 500 })
    const { applied, store } = createStore([local])
    const { transport } = createTransport([
      { blobs: [encodeRecord(remote, cipher)], cursor: "c" },
    ])

    const summary = await syncNow({
      cipher,
      deviceId: "device-1",
      store,
      transport,
    })

    expect(applied).toEqual([])
    expect(summary.applied).toBe(0)
    expect(summary.pulled).toBe(1)
  })
})
