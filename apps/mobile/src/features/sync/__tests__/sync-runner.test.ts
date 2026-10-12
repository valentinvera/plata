import { describe, expect, it } from "bun:test"

import {
  runSyncWithDeps,
  SyncKeyMismatchError,
  SyncKeyMissingError,
  type SyncRunnerDeps,
} from "../sync-runner"
import type { SyncApiClient } from "../sync-transport"
import type { SyncBlob, SyncStore, SyncTransport } from "../types"

const BLOB: SyncBlob = {
  ciphertext: "AA==",
  deletedAt: null,
  id: "tx-1",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

function createClient(
  remote: SyncBlob[],
  reservedKeyId?: string
): SyncApiClient {
  return {
    sync: {
      pull: { query: () => Promise.resolve({ blobs: remote, cursor: null }) },
      push: {
        mutate: (input) =>
          Promise.resolve({ accepted: input.blobs.map((blob) => blob.id) }),
      },
      reset: { mutate: () => Promise.resolve({ deleted: 0 }) },
      reserveKey: {
        mutate: (input) =>
          Promise.resolve({ keyId: reservedKeyId ?? input.keyId }),
      },
    },
  }
}

const STORE: SyncStore = {
  applyRemote: () => Promise.resolve(),
  getCursor: () => Promise.resolve(null),
  getRecord: () => Promise.resolve(null),
  listDirty: () => Promise.resolve([]),
  markSynced: () => Promise.resolve(),
  setCursor: () => Promise.resolve(),
}

const TRANSPORT: SyncTransport = {
  pull: () => Promise.resolve({ blobs: [], cursor: null }),
  push: () => Promise.resolve({ accepted: [] }),
}

function createDeps(overrides: Partial<SyncRunnerDeps> = {}) {
  const state = { initialized: 0 }
  const deps: SyncRunnerDeps = {
    createStore: () => STORE,
    createTransport: () => TRANSPORT,
    deviceId: "device-1",
    initializeKey: () => {
      state.initialized += 1

      return Promise.resolve(new Uint8Array(32).fill(1))
    },
    keyId: () => Promise.resolve("key-id"),
    randomBytes: (length) => new Uint8Array(length).fill(2),
    readKey: () => Promise.resolve(null),
    ...overrides,
  }

  return { deps, initialized: () => state.initialized }
}

describe("runSyncWithDeps", () => {
  it("initializes a key and syncs when the account has no remote data", async () => {
    const { deps, initialized } = createDeps()

    const summary = await runSyncWithDeps(createClient([]), deps)

    expect(initialized()).toBe(1)
    expect(summary).toEqual({ applied: 0, pulled: 0, pushed: 0 })
  })

  it("fails closed when remote data exists and there is no key", async () => {
    const { deps, initialized } = createDeps()

    await expect(runSyncWithDeps(createClient([BLOB]), deps)).rejects.toThrow(
      SyncKeyMissingError
    )
    expect(initialized()).toBe(0)
  })

  it("uses the existing key without initializing a new one", async () => {
    const { deps, initialized } = createDeps({
      readKey: () => Promise.resolve(new Uint8Array(32).fill(9)),
    })

    const summary = await runSyncWithDeps(createClient([BLOB]), deps)

    expect(initialized()).toBe(0)
    expect(summary).toEqual({ applied: 0, pulled: 0, pushed: 0 })
  })

  it("fails closed when the account already reserved a different key", async () => {
    const { deps } = createDeps({
      readKey: () => Promise.resolve(new Uint8Array(32).fill(9)),
    })

    await expect(
      runSyncWithDeps(createClient([], "another-key"), deps)
    ).rejects.toThrow(SyncKeyMismatchError)
  })
})
