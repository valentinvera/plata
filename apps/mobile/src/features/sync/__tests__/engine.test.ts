import { describe, expect, it } from "bun:test"
import {
  base64DecodedLength,
  MAX_BLOBS_PER_PUSH,
  MAX_PUSH_BYTES,
} from "@plata/trpc/sync"

import { encodeRecord } from "../codec"
import { createCipher } from "../crypto"
import { planPushBatches, syncNow } from "../engine"
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
    markSynced: (versions) => {
      for (const version of versions) {
        const current = records.get(version.id)

        if (current && current.updatedAt === version.updatedAt) {
          dirty.delete(version.id)
        }
      }

      return Promise.resolve()
    },
    setCursor: (value) => {
      cursor = value

      return Promise.resolve()
    },
  }

  return { applied, dirty, records, store, getCursor: () => cursor }
}

function createTransport(
  responses: { blobs?: SyncBlob[]; cursor?: string | null }[] = [],
  options: { accept?: (blob: SyncBlob) => boolean; onPush?: () => void } = {}
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
      options.onPush?.()
      const accepted = options.accept
        ? input.blobs.filter(options.accept).map((blob) => blob.id)
        : input.blobs.map((blob) => blob.id)

      return Promise.resolve({ accepted })
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

  it("splits a large backlog into batches that respect the server caps", async () => {
    const records = Array.from({ length: 250 }, (_, index) =>
      record({ id: `tx-${index}` })
    )
    const { store } = createStore(records)
    const { pushes, transport } = createTransport([{ blobs: [], cursor: null }])

    const summary = await syncNow({
      cipher,
      deviceId: "device-1",
      store,
      transport,
    })

    expect(pushes.map((push) => push.blobs.length)).toEqual([100, 100, 50])
    expect(summary.pushed).toBe(250)
  })

  it("does not acknowledge a record edited while the push was in flight", async () => {
    const { dirty, records, store } = createStore([record()])
    const { transport } = createTransport([{ blobs: [], cursor: null }], {
      onPush: () => {
        records.set("tx-1", record({ updatedAt: 200 }))
      },
    })

    const summary = await syncNow({
      cipher,
      deviceId: "device-1",
      store,
      transport,
    })

    expect(summary.pushed).toBe(1)
    expect(dirty.has("tx-1")).toBe(true)
  })

  it("keeps server-rejected versions dirty", async () => {
    const { dirty, store } = createStore([record()])
    const { transport } = createTransport([{ blobs: [], cursor: null }], {
      accept: () => false,
    })

    const summary = await syncNow({
      cipher,
      deviceId: "device-1",
      store,
      transport,
    })

    expect(summary.pushed).toBe(1)
    expect(dirty.has("tx-1")).toBe(true)
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

describe("planPushBatches", () => {
  it("caps each batch by the per-push payload size", () => {
    const payload = "x".repeat(60 * 1024)
    const records = Array.from({ length: 100 }, (_, index) =>
      record({ id: `tx-${index}`, payload })
    )

    const batches = planPushBatches(records, cipher)

    expect(batches.length).toBeGreaterThan(1)

    for (const batch of batches) {
      const total = batch.blobs.reduce(
        (sum, blob) => sum + base64DecodedLength(blob.ciphertext),
        0
      )

      expect(batch.blobs.length).toBeLessThanOrEqual(MAX_BLOBS_PER_PUSH)
      expect(total).toBeLessThanOrEqual(MAX_PUSH_BYTES)
    }
  })

  it("rejects a record larger than the per-blob cap", () => {
    const payload = "x".repeat(70 * 1024)

    expect(() => planPushBatches([record({ payload })], cipher)).toThrow()
  })
})
