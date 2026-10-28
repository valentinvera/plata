import { describe, expect, it } from "bun:test"

import { DEFAULT_CATEGORIES } from "../categories"
import {
  type NotificationPayload,
  notificationTransactionId,
} from "../notification"
import {
  createNotificationDrainer,
  createNotificationIngestor,
} from "../notification-processing"
import type { NewTransaction } from "../types"

function payload(time: string): NotificationPayload {
  return {
    app: "com.bank",
    bigText: "",
    text: "Compraste $4.500 en CARREFOUR",
    time,
    title: "Compra",
  }
}

interface TestQueue {
  ackAsync: () => Promise<void>
  acks: number
  failAck: boolean
  failRead: boolean
  pending: NotificationPayload[]
  readPendingsAsync: () => Promise<string>
  reads: number
  snapshotLength: number
}

function harness(initial: NotificationPayload[]) {
  const storage: {
    beforeCreate?: (input: NewTransaction) => Promise<void>
    deleted: Set<string>
    rows: Map<string, NewTransaction>
  } = { deleted: new Set(), rows: new Map() }
  const queue: TestQueue = {
    acks: 0,
    failAck: false,
    failRead: false,
    pending: [...initial],
    reads: 0,
    snapshotLength: 0,
    ackAsync() {
      if (this.failAck) {
        return Promise.reject(new Error("Queue unavailable"))
      }
      this.acks += 1
      this.pending.splice(0, this.snapshotLength)
      this.snapshotLength = 0
      return Promise.resolve()
    },
    readPendingsAsync() {
      if (this.failRead) {
        return Promise.reject(new Error("Queue unavailable"))
      }
      this.reads += 1
      this.snapshotLength = this.pending.length
      return Promise.resolve(JSON.stringify(this.pending))
    },
  }
  const ingest = createNotificationIngestor({
    async createTransaction(input) {
      await storage.beforeCreate?.(input)
      if (!input.id) {
        throw new Error("Missing source id")
      }
      if (storage.rows.has(input.id) || storage.deleted.has(input.id)) {
        throw new Error("Duplicate source")
      }
      storage.rows.set(input.id, input)
    },
    hasTransaction(id) {
      return Promise.resolve(storage.rows.has(id) || storage.deleted.has(id))
    },
    listCategories() {
      return Promise.resolve(DEFAULT_CATEGORIES)
    },
  })
  return {
    drain: createNotificationDrainer({ ingest, queue }),
    ingest,
    queue,
    storage,
  }
}

const first = payload("1700000000000")
const second = payload("1700000000001")

// Exercise the full read -> parse -> persist -> acknowledge -> retry path with
// controllable storage failures, without mocking Expo modules globally.
describe("notification queue delivery", () => {
  it("acknowledges saved, duplicate and irrelevant entries", async () => {
    const { drain, queue, storage } = harness([
      first,
      { ...first, text: "Hola", title: "Mensaje" },
      first,
      second,
    ])

    expect(await drain()).toBe(2)
    expect(storage.rows.size).toBe(2)
    expect(queue.acks).toBe(1)
    expect(queue.pending).toEqual([])
  })

  it.each([first, second])(
    "retains the batch after a failed write and retries without duplicates",
    async (failed) => {
      const { drain, queue, storage } = harness([first, second])
      const failure = new Error("Storage unavailable")
      storage.beforeCreate = (input) => {
        if (input.id === notificationTransactionId(failed)) {
          return Promise.reject(failure)
        }
        return Promise.resolve()
      }

      await expect(drain()).rejects.toBe(failure)
      expect(queue.acks).toBe(0)
      expect(queue.pending).toEqual([first, second])
      const alreadySaved = storage.rows.size

      storage.beforeCreate = undefined
      expect(await drain()).toBe(2 - alreadySaved)
      expect(storage.rows.size).toBe(2)
      expect(queue.acks).toBe(1)
      expect(queue.pending).toEqual([])
    }
  )

  it("does not recreate a transaction that was deleted before redelivery", async () => {
    const { drain, queue, storage } = harness([first])
    storage.deleted.add(notificationTransactionId(first))

    expect(await drain()).toBe(0)
    expect(storage.rows.size).toBe(0)
    expect(storage.deleted.size).toBe(1)
    expect(queue.acks).toBe(1)
  })

  it("accepts a source saved by another writer during insertion", async () => {
    const { drain, storage, queue } = harness([first])
    storage.beforeCreate = (input) => {
      if (input.id) {
        storage.rows.set(input.id, input)
      }
      return Promise.resolve()
    }

    expect(await drain()).toBe(0)
    expect(storage.rows.size).toBe(1)
    expect(queue.pending).toEqual([])
  })

  it("releases the running operation after a queue read fails", async () => {
    const { drain, queue, storage } = harness([first])
    queue.failRead = true

    await expect(drain()).rejects.toThrow("Queue unavailable")
    expect(queue.acks).toBe(0)
    expect(storage.rows.size).toBe(0)

    queue.failRead = false
    expect(await drain()).toBe(1)
  })

  it("retries a failed acknowledgement without inserting saved rows again", async () => {
    const { drain, queue, storage } = harness([first])
    queue.failAck = true

    await expect(drain()).rejects.toThrow("Queue unavailable")
    expect(queue.pending).toEqual([first])
    expect(storage.rows.size).toBe(1)

    queue.failAck = false
    expect(await drain()).toBe(0)
    expect(storage.rows.size).toBe(1)
    expect(queue.pending).toEqual([])
  })

  it("shares overlapping drains and leaves newer notifications for the next snapshot", async () => {
    const { drain, queue, storage } = harness([first])
    let release: () => void = () => undefined
    let started: () => void = () => undefined
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    const entered = new Promise<void>((resolve) => {
      started = resolve
    })
    storage.beforeCreate = async () => {
      started()
      await blocked
    }

    const running = drain()
    await entered
    queue.pending.push(second)
    const overlapping = drain()
    expect(overlapping).toBe(running)
    expect(queue.reads).toBe(1)

    release()
    expect(await running).toBe(1)
    expect(await overlapping).toBe(1)
    expect(queue.pending).toEqual([second])

    storage.beforeCreate = undefined
    expect(await drain()).toBe(1)
    expect(storage.rows.size).toBe(2)
    expect(queue.pending).toEqual([])
    expect(queue.reads).toBe(2)
  })

  it.each(["not json", "{}", "null"])(
    "does not acknowledge an invalid queue response",
    async (raw) => {
      let acks = 0
      const drain = createNotificationDrainer({
        ingest: () => Promise.reject(new Error("Must not ingest invalid data")),
        queue: {
          ackAsync() {
            acks += 1
            return Promise.resolve()
          },
          readPendingsAsync() {
            return Promise.resolve(raw)
          },
        },
      })

      expect(await drain()).toBe(0)
      expect(acks).toBe(0)
    }
  )
})
